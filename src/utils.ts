
type WebGLAnyRenderingContext = WebGLRenderingContext | WebGL2RenderingContext;

function isWebGL2Ctx(gl: WebGLAnyRenderingContext) : gl is WebGL2RenderingContext {
    return gl.getParameter(gl.VERSION).includes('WebGL 2.0');
}

type TypedArrayFloat = Float32Array;
type TypedArrayUint = Uint8Array | Uint16Array | Uint32Array;
type TypedArray = TypedArrayFloat | TypedArrayUint;

export {isWebGL2Ctx};
export type {WebGLAnyRenderingContext, TypedArrayFloat, TypedArrayUint, TypedArray};