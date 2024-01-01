
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

import { TypedArray, TypedArrayUint, WebGLAnyRenderingContext } from "./utils";

class WGLBufferBase {
    /** @internal */
    readonly gl: WebGLAnyRenderingContext;

    /** @internal */
    readonly n_coords_per_vert: number;

    /** @internal */
    readonly dtype: number;

    readonly n_verts: number;
    readonly draw_mode: GLenum;

    /** @internal */
    readonly buffer: WebGLBuffer;

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

/** A class representing a WebGL data buffer */
class WGLBuffer extends WGLBufferBase {
    /**
     * Create a WebGL buffer and put some data in it
     * @param gl                 - The WebGL rendering context
     * @param verts              - The vertex data to use for this buffer
     * @param n_coords_per_vert  - The number of coordinates for each vertex in the data buffer
     * @param draw_mode          - The draw mode to use for this buffer. Should be one of gl.TRIANGLE_STRIP, etc.
     */
    constructor(gl: WebGLAnyRenderingContext, verts: TypedArray, n_coords_per_vert: number, draw_mode: GLenum) {
        super(gl, verts, n_coords_per_vert, draw_mode, gl.ARRAY_BUFFER);
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
    bindToProgram(): void {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffer);
    }
}

export {WGLBuffer, WGLIndexBuffer};