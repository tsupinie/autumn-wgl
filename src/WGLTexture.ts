
/**
 * @module wgl/WebGLTexture
 * A module containing a helper class for WebGL textures
 */

import { WebGLAnyRenderingContext, isWebGL2Ctx } from "./utils";

interface WGLTextureSpecBase {
    format: GLenum;
    type: GLenum;
    mag_filter?: GLenum;
    row_alignment?: number;    
}

interface WGLTextureSpecRawImage extends WGLTextureSpecBase {
    width: number;
    height: number;
    image: ArrayBufferView;
}

function isRawImageTextureSpec(obj: any): obj is WGLTextureSpecRawImage {
    return 'width' in obj && 'height' in obj;
}

interface WGLTextureSpecCanvas extends WGLTextureSpecBase {
    image: HTMLCanvasElement;
}

type WGLTextureSpec = WGLTextureSpecCanvas | WGLTextureSpecRawImage;

function getWebGL2Format(gl: WebGL2RenderingContext, internal_format: number, data_type: number) : number {
    switch(data_type) {
        case(gl.UNSIGNED_BYTE):
            switch(internal_format) {
                case (gl.RGBA8): return gl.RGBA;
                case (gl.RGB5_A1): return gl.RGBA;
                case (gl.RGBA4): return gl.RGBA;
                case (gl.SRGB8_ALPHA8): return gl.RGBA;
                case (gl.RGBA8UI): return gl.RGBA_INTEGER;
                case (gl.RGB8): return gl.RGB;
                case (gl.RGB565): return gl.RGB;
                case (gl.SRGB8): return gl.RGB;
                case (gl.RGB8UI): return gl.RGB_INTEGER;
                case (gl.RG8): return gl.RG;
                case (gl.RG8UI): return gl.RG_INTEGER;
                case (gl.R8): return gl.RED;
                case (gl.R8UI): return gl.RED_INTEGER;
                case (gl.RGBA): return gl.RGBA;
                case (gl.RGB): return gl.RGB;
                case (gl.LUMINANCE_ALPHA): return gl.LUMINANCE_ALPHA;
                case (gl.LUMINANCE): return gl.LUMINANCE;
                case (gl.ALPHA): return gl.ALPHA;
            }
            break;
        case(gl.BYTE):
            switch(internal_format) {
                case (gl.RGBA8_SNORM): return gl.RGBA;
                case (gl.RGBA8I): return gl.RGBA_INTEGER;
                case (gl.RGB8_SNORM): return gl.RGB;
                case (gl.RGB8I): return gl.RGB_INTEGER;
                case (gl.RG8_SNORM): return gl.RG;
                case (gl.RG8I): return gl.RG_INTEGER;
                case (gl.R8_SNORM): return gl.RED;
                case (gl.R8I): return gl.RED_INTEGER;
            }
            break;
        case(gl.UNSIGNED_SHORT_4_4_4_4):
            switch(internal_format) {
                case (gl.RGBA4): return gl.RGBA;
                case (gl.RGBA): return gl.RGBA;
            }
            break;
        case(gl.UNSIGNED_SHORT_5_5_5_1):
            switch(internal_format) {
                case (gl.RGB5_A1): return gl.RGBA;
                case (gl.RGBA): return gl.RGBA;
            }
            break;
        case(gl.UNSIGNED_INT_2_10_10_10_REV):
            switch(internal_format) {
                case (gl.RGB10_A2): return gl.RGBA;
                case (gl.RGB5_A1): return gl.RGBA;
                case (gl.RGB10_A2UI): return gl.RGBA_INTEGER;
            }
            break;
        case(gl.HALF_FLOAT):
            switch(internal_format) {
                case (gl.RGBA16F): return gl.RGBA;
                case (gl.RGB16F): return gl.RGB;
                case (gl.R11F_G11F_B10F): return gl.RGB;
                case (gl.RGB9_E5): return gl.RGB;
                case (gl.RG16F): return gl.RG;
                case (gl.R16F): return gl.RED;
            }
            break;
        case(gl.FLOAT):
            switch(internal_format) {
                case (gl.RGBA32F): return gl.RGBA;
                case (gl.RGBA16F): return gl.RGBA;
                case (gl.RGB32F): return gl.RGB;
                case (gl.RGB16F): return gl.RGB;
                case (gl.R11F_G11F_B10F): return gl.RGB;
                case (gl.RGB9_E5): return gl.RGB;
                case (gl.RG32F): return gl.RG;
                case (gl.RG16F): return gl.RG;
                case (gl.R32F): return gl.RED;
                case (gl.R16F): return gl.RED;
                case (gl.DEPTH_COMPONENT32F): return gl.DEPTH_COMPONENT;
            }
            break;
        case(gl.UNSIGNED_SHORT):
            switch(internal_format) {
                case (gl.RGBA16UI): return gl.RGBA_INTEGER;
                case (gl.RGB16UI): return gl.RGB_INTEGER;
                case (gl.RG16UI): return gl.RG_INTEGER;
                case (gl.R16UI): return gl.RED_INTEGER;
                case (gl.DEPTH_COMPONENT16): return gl.DEPTH_COMPONENT;
            }
            break;
        case(gl.SHORT):
            switch(internal_format) {
                case (gl.RGBA16I): return gl.RGBA_INTEGER;
                case (gl.RGB16I): return gl.RGB_INTEGER;
                case (gl.RG16I): return gl.RG_INTEGER;
                case (gl.R16I): return gl.RED_INTEGER;
            }
            break;
        case(gl.UNSIGNED_INT):
            switch(internal_format) {
                case (gl.RGBA32UI): return gl.RGBA_INTEGER;
                case (gl.RGB32UI): return gl.RGB_INTEGER;
                case (gl.RG32UI): return gl.RG_INTEGER;
                case (gl.R32UI): return gl.RED_INTEGER;
                case (gl.DEPTH_COMPONENT24): return gl.DEPTH_COMPONENT;
                case (gl.DEPTH_COMPONENT16): return gl.DEPTH_COMPONENT;
            }
            break;
        case(gl.INT):
            switch(internal_format) {
                case (gl.RGBA32I): return gl.RGBA_INTEGER;
                case (gl.RGB32I): return gl.RGB_INTEGER;
                case (gl.RG32I): return gl.RG_INTEGER;
                case (gl.R32I): return gl.RED_INTEGER;
            }
            break;
        case(gl.UNSIGNED_SHORT_5_6_5):
            switch(internal_format) {
                case (gl.RGB565): return gl.RGB;
                case (gl.RGB): return gl.RGB;
            }
            break;
        case(gl.UNSIGNED_INT_10F_11F_11F_REV):
            switch(internal_format) {
                case (gl.R11F_G11F_B10F): return gl.RGB;
            }
            break;
        case(gl.UNSIGNED_INT_5_9_9_9_REV):
            switch(internal_format) {
                case (gl.RGB9_E5): return gl.RGB;
            }
            break;
        case(gl.UNSIGNED_INT_24_8):
            switch(internal_format) {
                case (gl.DEPTH24_STENCIL8): return gl.DEPTH_STENCIL;
            }
            break;
        case(gl.FLOAT_32_UNSIGNED_INT_24_8_REV):
            switch(internal_format) {
                case (gl.DEPTH32F_STENCIL8): return gl.DEPTH_STENCIL;
            }
            break;
        default:
            throw `Unknown format in getWebGL2InternalFormat`;
    }

    throw `Invalid combination of internal format and data type`;
}

/** Class representing a WebGL texture */
class WGLTexture {
    /** @internal */
    readonly gl: WebGLAnyRenderingContext;

    /** @internal */
    readonly texture: WebGLTexture;

    /** @internal */
    tex_num: number | null;

    /**
     * 
     * @param gl               - The WebGL rendering context
     * @param image            - The specification for the image
     * @param image.format     - The format for the image (e.g., which color channels are present?). Should be one of gl.RGBA, gl.RGB, etc.
     * @param image.type       - The data type for the image. Should be one of gl.FLOAT, gl.UNSIGNED_BYTE, etc.
     * @param image.width      - The width of the texture
     * @param image.height     - The height of the texture
     * @param image.mag_filter - The magnification filter to use for the texture. Should be one of gl.LINEAR, gl.NEAREST, etc.
     * @param image.image      - The image to use for the texture. Can be null to allocate space without filling it.
     */
    constructor(gl: WebGLAnyRenderingContext, image: WGLTextureSpec) {
        this.gl = gl;

        const texture = gl.createTexture();
        if (texture === null) {
            throw "Could not create WebGL texture";
        }

        this.texture = texture;
        this.tex_num = null;

        this.setImageData(image);

        const mag_filter = image['mag_filter'] === undefined ? gl.LINEAR : image['mag_filter'];

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag_filter);
    }

    /**
     * Set image data in this texture
     * @param image        - The specification for the image
     * @param image.format - The format for the image (e.g., which color channels are present?). Should be one of gl.RGBA, gl.RGB, etc.
     * @param image.type   - The data type for the image. Should be one of gl.FLOAT, gl.UNSIGNED_BYTE, etc.
     * @param image.width  - The width of the texture
     * @param image.height - The height of the texture
     * @param image.image  - The image to use for the texture. Can be null to allocate space without filling it.
     */
    setImageData(image: WGLTextureSpec): void {
        const gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        const format = isWebGL2Ctx(gl) ? getWebGL2Format(gl, image['format'], image['type']) : image['format'];

        const row_alignment = image['row_alignment'] === undefined ? 4 : image['row_alignment'];
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, row_alignment);

        if (isRawImageTextureSpec(image)) {
            gl.texImage2D(gl.TEXTURE_2D, 0, image['format'], image['width'], image['height'], 0, format, image['type'], image['image']);
        }
        else {
            gl.texImage2D(gl.TEXTURE_2D, 0, image['format'], format, image['type'], image['image']);
        }
    }

    /**
     * Bind this texture to a location in a shader program
     * @internal
     * @param prog_uni_location - The location of the sampler uniform value (returned from gl.getUniform()) in the shader program.
     * @param gl_tex_num        - The texture number to bind this texture to.
     */
    bindToProgram(prog_uni_location: WebGLUniformLocation, gl_tex_num: number): void {
        this.activate(gl_tex_num);
        this.gl.uniform1i(prog_uni_location, gl_tex_num);
    }

    /**
     * Bind this texture to a given texture number
     * @param gl_tex_num - The texture number to bind this texture to.
     */
    activate(gl_tex_num: number): void {
        this.tex_num = gl_tex_num;
        this.gl.activeTexture(this.gl.TEXTURE0 + this.tex_num);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    }

    /**
     * Unbind this texture from the texture number it was most recently bound to.
     */
    deactivate(): void {
        if (this.tex_num === null) {
            return;
        }

        this.gl.activeTexture(this.gl.TEXTURE0 + this.tex_num);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.tex_num = null;
    }

    /**
     * Delete this texture.
     */
    delete(): void {
        this.gl.deleteTexture(this.texture);
        this.tex_num = null;
    }
}

export {WGLTexture};
export type {WGLTextureSpec}