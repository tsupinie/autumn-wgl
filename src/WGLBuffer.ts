
/**
 * @module wgl/WebGLBuffer
 * Module containing a helper class for WebGL data buffers
 */

const getGLDtype = (gl: WebGLAnyRenderingContext, ary: TypedArray) => {
    const DTYPES: Record<string, number> = {
        'Float32Array': gl.FLOAT,
        'Uint8Array': gl.UNSIGNED_BYTE,
        'Uint16Array': gl.UNSIGNED_SHORT,
        'Uint32Array': gl.UNSIGNED_INT,
    }
    
    return DTYPES[ary.constructor.name];
}

import { TypedArray, TypedArrayUint, WebGLAnyRenderingContext, isWebGL2Ctx } from "./utils";

class WGLBufferBase {
    /** @internal */
    protected readonly gl: WebGLAnyRenderingContext;

    /** @internal */
    protected readonly n_coords_per_vert: number;

    /** @internal */
    public readonly dtype: number;

    public readonly n_verts: number;
    public readonly draw_mode: GLenum;

    /** @internal */
    protected readonly buffer: WebGLBuffer;

    constructor(gl: WebGLAnyRenderingContext, verts: TypedArray, n_coords_per_vert: number, draw_mode: GLenum, bind_target: number) {
        this.gl = gl;
        this.n_coords_per_vert = n_coords_per_vert;
        this.dtype = getGLDtype(gl, verts);

        this.n_verts = verts.length / n_coords_per_vert;
        this.draw_mode = draw_mode;

        const buffer = gl.createBuffer()
        if (buffer === null) {
            throw "Could not create WebGL buffer";
        }

        this.buffer = buffer;
        gl.bindBuffer(bind_target, this.buffer);
        gl.bufferData(bind_target, verts, gl.STATIC_DRAW);
    }
}

interface WGLBufferOpts {
    per_instance?: boolean;
}

/** A class representing a WebGL data buffer */
class WGLBuffer extends WGLBufferBase {
    public readonly is_per_instance: boolean

    private readonly vadFunc: (prog_attr_location: number, instance_skip: number) => void;

    /**
     * Create a WebGL buffer and put some data in it
     * @param gl                 - The WebGL rendering context
     * @param verts              - The vertex data to use for this buffer
     * @param n_coords_per_vert  - The number of coordinates for each vertex in the data buffer
     * @param draw_mode          - The draw mode to use for this buffer. Should be one of gl.TRIANGLE_STRIP, etc.
     */
    constructor(gl: WebGLAnyRenderingContext, verts: TypedArray, n_coords_per_vert: number, draw_mode: GLenum, opts?: WGLBufferOpts) {
        super(gl, verts, n_coords_per_vert, draw_mode, gl.ARRAY_BUFFER);
        
        opts = opts === undefined ? {} : opts;
        this.is_per_instance = opts.per_instance === undefined ? false : opts.per_instance;

        // Cache which version of the function to use, avoiding running gl.getParameter in the render loop
        if (isWebGL2Ctx(this.gl)) {
            this.vadFunc = this.gl.vertexAttribDivisor;
        }
        else {
            const ext = this.gl.getExtension("ANGLE_instanced_arrays");
            this.vadFunc = ext.vertexAttribDivisorANGLE;
        }
    }

    /**
     * Bind this buffer to a location in a shader program
     * @internal
     * @param prog_attr_location - The location of the variable in the shader program (returned from gl.getAttribLocation())
     */
    bindToProgram(prog_attr_location: number): void {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
        this.gl.enableVertexAttribArray(prog_attr_location);
        this.gl.vertexAttribPointer(prog_attr_location, this.n_coords_per_vert, this.dtype, false, 0, 0);

        const instance_skip = this.is_per_instance ? 1 : 0;

        this.vadFunc(prog_attr_location, instance_skip);
    }
}

/** A class representing a WebGL data buffer for array indices */
class WGLIndexBuffer extends WGLBufferBase {
    /**
     * 
     * @param gl         - The WebGL rendering context
     * @param indices    - The index data
     * @param draw_mode  - The draw mode to use for this buffer. Should be one of gl.TRIANGLE_STRIP, etc.
     */
    constructor(gl: WebGLAnyRenderingContext, indices: TypedArrayUint, draw_mode: GLenum) {
        super(gl, indices, 1, draw_mode, gl.ELEMENT_ARRAY_BUFFER);
    }

    /**
     * Bind this buffer to the ELEMENT_ARRAY_BUFFER target
     * @internal
     */
    bind(): void {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    }
}

export {WGLBuffer, WGLIndexBuffer};