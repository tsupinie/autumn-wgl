
import { WGLBuffer, WGLIndexBuffer } from "./WGLBuffer";
import { WGLTexture } from "./WGLTexture";
import { isWebGL2Ctx, WebGLAnyRenderingContext } from "./utils";

/**
 * @module wgl/WebGLProgram
 * Module containing a helper class for WebGL programs
 */

function preprocessShader(shader_src: string, opts?: {define?: string[]}) {
    opts = opts === undefined ? {} : opts;
    const defines = opts.define === undefined ? [] : [...opts.define];

    const current_defines: string[] = [];
    const define_truth: Record<string, boolean> = {};

    const processed_shader_src = shader_src.split("\n").map(line => {
        const match_define = line.match(/#define\s+([\w\d_]+)/i);
        if (match_define !== null) {
            defines.push(match_define[1]);
        }

        const match_ifdef = line.match(/#ifdef\s+([\w\d_]+)/i);
        if (match_ifdef !== null) {
            current_defines.push(match_ifdef[1]);
            define_truth[match_ifdef[1]] = true;
            return "";
        }

        const match_ifndef = line.match(/#ifndef\s+([\w\d_]+)/i);
        if (match_ifndef !== null) {
            current_defines.push(match_ifndef[1]);
            define_truth[match_ifndef[1]] = false;
            return "";
        }

        const match_else = line.match(/#else/i);
        if (match_else !== null) {
            const def = current_defines[current_defines.length - 1];
            define_truth[def] = !define_truth[def];
            return "";
        }

        const match_endif = line.match(/#endif/i);
        if (match_endif !== null) {
            const def = current_defines.pop();
            define_truth[def] = undefined;
            return "";
        }

        const keep_line = current_defines.map(def => defines.includes(def) == define_truth[def]).reduce((a, b) => a && b, true)
        return keep_line ? line : "";
    }).join("\n");

    if (current_defines.length > 0) {
        throw `Unterminated #ifdef/#ifndef block in shader`;
    }

    return processed_shader_src;
}

/**
 * Compile and link a shader program
 * @param gl                - The WebGL rendering context
 * @param vertex_shader_src - The source code for the vertex shader
 * @param frag_shader_src   - The source code for the fragment shader
 * @returns                   A compiled and linked WebGL program
 */
const compileAndLinkShaders = (gl: WebGLAnyRenderingContext, vertex_shader_src: string, frag_shader_src: string): WebGLProgram => {
    // create a vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (vertexShader === null) {
        throw "Could not create vertex shader";
    }

    gl.shaderSource(vertexShader, vertex_shader_src);
    gl.compileShader(vertexShader);

    const vertexCompiled = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);

    if (!vertexCompiled) {
        const compilationLog = gl.getShaderInfoLog(vertexShader);
        console.log('Vertex shader compiler log: ' + compilationLog);
    }
    
    // create a fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (fragmentShader === null) {
        throw "Could not create fragment shader";
    }

    gl.shaderSource(fragmentShader, frag_shader_src);
    gl.compileShader(fragmentShader);

    const fragmentCompiled = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);

    if (!fragmentCompiled) {
        const compilationLog = gl.getShaderInfoLog(fragmentShader);
        console.log('Fragment shader compiler log: ' + compilationLog);
    }

    // link the two shaders into a WebGL program
    const program = gl.createProgram();
    if (program === null) {
        throw "Could not create shader program";
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (!linked) {
        const linkLog = gl.getProgramInfoLog(program);
        console.log('Linker log: ' + linkLog);
    }

    return program;
}

/** Class representing a WebGL shader program */
class WGLProgram {
    /** @internal */
    private readonly gl: WebGLAnyRenderingContext;

    /** @internal */
    private readonly prog: WebGLProgram;

    /** @internal */
    private readonly attributes: Record<string, { type: string; location: number; }>

    /** @internal */
    private readonly uniforms: Record<string, { type: string; location: WebGLUniformLocation; }>

    /** @internal */
    private index_buffer: WGLIndexBuffer | null;

    /** @internal */
    private n_verts: number | null;

    /** @internal */
    private draw_mode: number | null;

    /** @internal */
    private sampler_names: string[]

    /**
     * Create and compile a shader program from source
     * @param gl                  - The WebGL rendering context
     * @param vertex_shader_src   - The vertex shader source code
     * @param fragment_shader_src - The fragment shader source code
     * @param opts.define         - Preprocessor macros to define (like -D when running gcc)
     */
    constructor(gl: WebGLAnyRenderingContext, vertex_shader_src: string, fragment_shader_src: string, opts?: {define?: string[]}) {
        vertex_shader_src = preprocessShader(vertex_shader_src, opts);
        fragment_shader_src = preprocessShader(fragment_shader_src, opts);

        this.gl = gl;
        this.prog = compileAndLinkShaders(gl, vertex_shader_src, fragment_shader_src);

        this.attributes = {};
        this.uniforms = {};

        this.n_verts = null;
        this.draw_mode = null;
        this.index_buffer = null;
        this.sampler_names = [];

        const remove_comments = (line: string) => {
            const comment_idx = line.indexOf('//');
            if (comment_idx >= 0) {
                line = line.slice(0, comment_idx);
            }
            return line;
        }

        vertex_shader_src = vertex_shader_src.split('\n').map(remove_comments).join('\n');
        fragment_shader_src = fragment_shader_src.split('\n').map(remove_comments).join('\n');

		// safety check the vertex shader source
		const is_webgl2 = isWebGL2Ctx(this.gl);
		if (!is_webgl2 && 
			(vertex_shader_src.includes('#version 300 es') || fragment_shader_src.includes('#version 300 es'))) {
			throw `WebGL2 context required for shader source containing '#version 300 es'`;
		}

        // in WebGL2 shaders (gl 300 es), attribute just become the keyword 'in'
        let vtx_shader_match = is_webgl2 ? 
            /\b(?:in|attribute)+([\w ]+?) +([\w_]+);[\s]*/mg : /attribute +([\w ]+?) +([\w_]+);[\s]*/mg

        for (const match of vertex_shader_src.matchAll(vtx_shader_match)) {
            const [full_match, type, a_name] = match;
            this.attributes[a_name] = {'type': type, 'location': gl.getAttribLocation(this.prog, a_name)};
        }

        for (const match of vertex_shader_src.matchAll(/uniform +([\w ]+?) +([\w_]+)(?:[\s]*\[.*\])?;[\s]*/mg)) {
            const [full_match, type, u_name] = match;
            const type_parts = type.split(' ');

            const uniform_loc = gl.getUniformLocation(this.prog, u_name);
            if (uniform_loc === null) {
                throw `Could not get vertex shader uniform location for '${u_name}'`;
            }

            this.uniforms[u_name] = {'type': type_parts[type_parts.length - 1], 'location': uniform_loc};
        }

        for (const match of fragment_shader_src.matchAll(/uniform +([\w ]+?) +([\w_]+)(?:[\s]*\[.*\])?;[\s]*/mg)) {
            const [full_match, type, u_name] = match;
            const type_parts = type.split(' ');

            const uniform_loc = gl.getUniformLocation(this.prog, u_name);
            if (uniform_loc === null) {
                throw `Could not get fragment shader uniform location for '${u_name}'`;
            }

            this.uniforms[u_name] = {'type': type_parts[type_parts.length - 1], 'location': uniform_loc};
        }

        Object.entries(this.uniforms).forEach(([u_name, uniform]) => {
            if (uniform.type.toLowerCase() == 'sampler2d') {
                this.sampler_names.push(u_name);
            }
        })
    }

    /**
     * Enable this program for rendering and optionally bind attribute, uniform, and texture values. This function should be called before calling 
     * {@link WGLProgram.bindAttributes}, {@link WGLProgram.setUniforms}, or {@link WGLProgram.bindTextures} on a given rendering pass.
     * @param attribute_buffers - An object with the keys being the attribute variable names and the values being the buffers to associate with each variable
     * @param uniform_values    - An object with the keys being the uniform variable names and the values being the uniform values
     * @param textures          - An object with the keys being the sampler names in the source code and the values being the textures to associate with each sampler
     * @param index_buffer      - A WGLIndexBuffer specifying which indices to draw in which order
     */
    use(attribute_buffers?: Record<string, WGLBuffer>, uniform_values?: Record<string, (number | number[])>, textures?: Record<string, WGLTexture>, 
        index_buffer?: WGLIndexBuffer): void {

        this.gl.useProgram(this.prog);

        if (index_buffer !== undefined) {
            index_buffer.bind();
            this.index_buffer = index_buffer;
        }
        else {
            this.index_buffer = null;
        }

        this.draw_mode = null;
        this.n_verts = null;

        if (attribute_buffers !== undefined) {
            this.bindAttributes(attribute_buffers);
        }

        if (uniform_values !== undefined) {
            this.setUniforms(uniform_values);
        }

        if (textures !== undefined) {
            this.bindTextures(textures);
        }
    }

    /**
     * Bind attribute buffers to variables in this shader program. When rendring, call {@link WGLProgram.use} before calling this function.
     * @param attribute_buffers - An object with the keys being the attribute variable names and the values being the buffers to associate with each variable
     */
    bindAttributes(attribute_buffers: Record<string, WGLBuffer>): void {
        Object.entries(attribute_buffers).forEach(([a_name, buffer]) => {
            if (this.attributes[a_name] === undefined) {
                console.warn(`Skipping attribute buffer provided for '${a_name}' because the attribute was not found in the program.`);
                return;
            }

            this.n_verts = this.n_verts === null ? buffer.n_verts : this.n_verts;
            this.draw_mode = this.draw_mode === null ? buffer.draw_mode : this.draw_mode;

            if (this.draw_mode != buffer.draw_mode) {
                throw `Unexpected draw mode for attribute buffer ${a_name} (expected ${this.draw_mode}, got ${buffer.draw_mode}).`;
            }

            if (this.n_verts != buffer.n_verts) {
                throw `Unexpected number of vertices for attribute buffer ${a_name} (expected ${this.n_verts}, got ${buffer.n_verts}).`;
            }

            const {type, location} = this.attributes[a_name];
            buffer.bindToProgram(location);
        });
    }

    /**
     * Set uniform values in this shader program. When rendering, call {@link WGLProgram.use} before calling this function.
     * @param uniform_values - An object with the keys being the uniform variable names and the values being the uniform values
     */
    setUniforms(uniform_values: Record<string, (number | number[])>): void {
        Object.entries(uniform_values).forEach(([u_name, value]) => {
            if (this.uniforms[u_name] === undefined) {
                console.warn(`Skipping uniform value provided for '${u_name}' because the uniform was not found in the program.`);
                return;
            }

            const {type, location} = this.uniforms[u_name];

            if (type === 'int' && typeof value == 'number') {
                this.gl.uniform1i(location, value);
            }
            else if (type === 'float' && typeof value == 'number') {
                this.gl.uniform1f(location, value);
            }
            else if (type === 'float' && value instanceof Array) {
                this.gl.uniform1fv(location, value);
            }
            else if (type === 'vec2' && value instanceof Array) {
                this.gl.uniform2fv(location, value);
            }
            else if (type === 'vec3' && value instanceof Array) {
                this.gl.uniform3fv(location, value);
            }
            else if (type === 'vec4' && value instanceof Array) {
                this.gl.uniform4fv(location, value);
            }
            else if (type === 'mat4' && value instanceof Array) {
                this.gl.uniformMatrix4fv(location, false, value);
            }
            else {
                throw `Could not figure out uniform function for type '${type}' and value '${String(value)}'`;
            }
        });
    }

    /**
     * Bind textures to samplers in this shader program. When rendring, call {@link WGLProgram.use} before calling this function.
     * @param textures - An object with the keys being the sampler names in the source code and the values being the textures to associate with each sampler
     */
    bindTextures(textures: Record<string, WGLTexture>) {
        Object.entries(textures).forEach(([sampler_name, texture]) => {
            if (this.uniforms[sampler_name] === undefined) {
                console.warn(`Skipping texture provided for sampler '${sampler_name}' because the sampler was not found in the program.`)
                return;
            }

            const gl_tex_num = this.sampler_names.indexOf(sampler_name);

            const {type, location} = this.uniforms[sampler_name];
            texture.bindToProgram(location, gl_tex_num);
        });
    }

    /**
     * Run this shader program.
     */
    draw(): void {
        if (this.draw_mode === null || this.n_verts === null) {
            throw "Cannot draw without binding attribute buffers";
        }

        if (this.index_buffer === null) {
            this.gl.drawArrays(this.draw_mode, 0, this.n_verts);
        }
        else {
            this.gl.drawElements(this.draw_mode, this.index_buffer.n_verts, this.index_buffer.dtype, 0);
        }
    }
}

export {WGLProgram};
