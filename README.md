# autumn-wgl
High(-er)-level WebGL1 components

## Install
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

For textures, if you have a texture rendered in an offscreen canvas, you can create `image_data` like this
```javascript
const image_data = {
  format: gl.RGBA,
  type: gl.UNSIGNED_BYTE,     
  image: canvas_element,             // HTML canvas element containing the image data
  mag_filter: magnification_filter   // e.g., gl.LINEAR
};
```

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

// Render to the screen buffer (specifying what region with `lower_left_x`, `lower_left_y`, `width`, and `height`);
WGLFramebuffer.screen(gl).renderTo(lower_left_x, lower_left_y, width, height);

// Do the actual drawing
program.draw();
```
