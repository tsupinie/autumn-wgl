# autumn-wgl
High(-er)-level WebGL components.

Using WebGL requires calling a lot of low-level functions with hard-to-remember names multiple times. So I made a library that's hopefully easier to keep straight.

## Installation
```bash
npm i autumn-wgl
```

## Basic Usage
In WebGL rendering, there are usually two phases: a "setup" phase, where where you compile your shader program and put all the required data onto video RAM, and a "render" phase, which actually does the drawing.

### Setup phase
```javascript
// Compile a shader program
const program = new WGLProgram(
  gl,            // WebGL1 rendering context
  vertex_src,    // vertex shader source code
  fragment_src,  // fragment shader source code
);

// Create a vertex buffer object (VBO)
const buffer = new WGLBuffer(
  gl,            // WebGL1 rendering context
  vertex_data,   // The vertex data as a Float32Array
  n_coords,      // The number of coordinates per vertex
  draw_mode      // e.g., gl.TRIANGLE_STRIP
);

// Set up texture data
const tex_coords = new WGLBuffer(gl, texcoord_data, n_coords, draw_mode);

const image_data = {
  format: data_format,               // e.g., gl.RGBA for an RGBA image
  type: data_type,                   // e.g., gl.UNSIGNED_BYTE for unsigned byte image data        
  image: image,                      // Image data as a typed array with the type corresponding to `data_type`
  width: image_width,                // Texture width in pixels
  height: image_height,              // Texture height in pixels
  mag_filter: magnification_filter   // e.g., gl.LINEAR
};

const texture = new WGLTexture(gl, image_data);
```

If you have a texture image rendered into a canvas element, you can create `image_data` like this
```javascript
const image_data = {
  format: gl.RGBA,
  type: gl.UNSIGNED_BYTE,     
  image: canvas_element,             // HTML canvas element containing the image data
  mag_filter: magnification_filter   // e.g., gl.LINEAR
};
```

Additionally, for WebGL2, supply the internal format (e.g., `gl.RGBA8`) in `format`, and the correct format will be computed internally.

### Render phase
```javascript
// Use an already-compiled program object
program.use();

// Bind attributes to VBOs
program.bindAttributes({
  'a_attribute': buffer,     // The `a_attribute` variable in the shader program gets bound to the `buffer` VBO
  'a_texcoord': tex_coords,  // The `a_texcoord` variable in the shader program gets bound to the `tex_coords` VBO
});

// Set values for uniforms
program.setUniforms({
  'u_uniform': 42,          // The `u_uniform` variable (declared as a float) in the shader program gets set to 42
  'u_color': [0., 0., 0.],  // The `u_color` variable (declared as a vec3) in the shader program gets set to [0., 0., 0.]
});

// Bind samplers in the shader program to texture objects
program.bindTextures({
  'u_texture_sampler': texture,  // The `u_texture_sampler` variable (declared as a sampler2D) gets data from the object `texture`.
});

// Do the above four calls in one step
program.use(
  {'a_attribute': buffer, 'a_texcoord': tex_coords},
  {'u_uniform': 42, 'u_color': [0., 0., 0.]},
  {'u_texture_sampler': texture}
);

// Set the screen buffer as the render target (specifying what region with `lower_left_x`, `lower_left_y`, `width`, and `height`);
WGLFramebuffer.screen(gl).renderTo(lower_left_x, lower_left_y, width, height);

// Clear the screen buffer to black
WGLFramebuffer.screen(gl).clear([0., 0., 0., 1.]);

// Do the actual drawing
program.draw();
```

## Advanced Usage
The `WGLFramebuffer` class represents a framebuffer for offscreen rendering. (As one might be able to guess, the screen buffer is also a `WGLFramebuffer`, so they share a lot of the same functions.)
```javascript
// [In the setup phase] Create a framebuffer object
const fbo_image_data = {
  format: data_format,  // e.g., gl.RGBA for an RGBA image
  type: data_type,      // e.g., gl.UNSIGNED_BYTE for unsigned byte image data        
  image: null,          // null to declare space in video RAM, but not fill it with anything
  width: fbo_width,     // Framebuffer width in pixels
  height: fbo_height,   // Framebuffer height in pixels
};

const fbo_texture = new WGLTexture(gl, fbo_image_data);
const fbo = new WGLFramebuffer(gl, fbo_texture);

// [In the render phase] Set the frame buffer as the render target and clear to transparent
fbo.renderTo(0, 0, fbo_width, fbo_height);
fbo.clear([0., 0., 0., 0.]);
```

In some advanced rendering, you may want to run the same program several times, rendering to offscreen buffers on each pass. A common technique is to alternate between two framebuffers. Use the `flipFlopBuffers()` function to make this easier.
```javascript
const doRender = (src, dest, ipass) => {
  // Do whatever rendering in this function. `src` is the source framebuffer for this pass, `dest` is the destination
  //  framebuffer for this pass, and `ipass` is the pass number (e.g., 0 for the 1st pass, 1 for the second pass, etc.)
};

flipFlopBuffers(
  n_passes,     // The number of render passes to do
  source_fb,    // The source framebuffer (set this to the second of your auxiliary framebuffer objects if the initial data aren't from a framebuffer)
  auxilary_fb,  // A length-2 tuple of framebuffer objects to alternate between on each rendering pass
  doRender      // Your function that does the rendering on each pass
);
```
