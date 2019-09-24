import {asArray} from '../color.js';

/**
 * Utilities for generating shaders from literal style objects
 * @module ol/webgl/ShaderBuilder
 */

/**
 * Will return the number as a float with a dit separator, which is required by GLSL.
 * @param {number} v Numerical value.
 * @returns {string} The value as string.
 */
export function formatNumber(v) {
  const s = v.toString();
  return s.indexOf('.') === -1 ? s + '.0' : s;
}

/**
 * @typedef {Object} SymbolShaderParameters
 * @property {number|Array.<number, number>} size Size.
 * @property {boolean} [rotateWithView] Rotate with view.
 * @property {Array.<number, number>} [offset] Offset.
 * @property {Array.<number, number, number, number>} [textureCoord] Texture coordinates: u0, v0, u1, v1.
 * @property {number} [opacity] Opacity.
 * @property {import("../color.js").Color|string} [color] Color.
 */

/**
 * Generates a symbol shader, i.e. a shader intended to be used on point geometries.
 *
 * Expected the following attributes to be present in the attribute array:
 * `vec2 a_position`, `float a_index` (being the index of the vertex in the quad, 0 to 3).
 *
 * Transmits the following varyings to the fragment shader:
 * `vec2 v_texCoord`, `float v_opacity`, `vec4 v_color`
 *
 * @param {SymbolShaderParameters} parameters Parameters for the shader.
 * @returns {string} The full shader as a string.
 */
export function getSymbolVertexShader(parameters) {
  const offsetMatrix = parameters.rotateWithView ?
    'mat4 offsetMatrix = u_offsetScaleMatrix * u_offsetRotateMatrix;' :
    'mat4 offsetMatrix = u_offsetScaleMatrix;';

  const offset = parameters.offset || [0, 0];
  const size = Array.isArray(parameters.size) ? parameters.size : [parameters.size, parameters.size];
  const texCoord = parameters.textureCoord || [0, 0, 1, 1];
  const opacity = parameters.opacity !== undefined ? parameters.opacity : 1;
  const color = parameters.color !== undefined ?
    (typeof parameters.color === 'string' ? asArray(parameters.color) : parameters.color) :
    [255, 255, 255, 1];
  function normalizeColor(c, i) {
    return i < 3 ? c / 255 : c;
  }

  const f = formatNumber;

  const body = `precision mediump float;
uniform mat4 u_projectionMatrix;
uniform mat4 u_offsetScaleMatrix;
uniform mat4 u_offsetRotateMatrix;
attribute vec2 a_position;
attribute float a_index;
varying vec2 v_texCoord;
varying float v_opacity;
varying vec4 v_color;

void main(void) {
  ${offsetMatrix}
  float offsetX = a_index == 0.0 || a_index == 3.0 ? ${f(offset[0] - size[0] / 2)} : ${f(offset[0] + size[0] / 2)};
  float offsetY = a_index == 0.0 || a_index == 1.0 ? ${f(offset[1] - size[1] / 2)} : ${f(offset[1] + size[1] / 2)};
  vec4 offsets = offsetMatrix * vec4(offsetX, offsetY, 0.0, 0.0);
  gl_Position = u_projectionMatrix * vec4(a_position, 0.0, 1.0) + offsets;
  float u = a_index == 0.0 || a_index == 3.0 ? ${f(texCoord[0])} : ${f(texCoord[2])};
  float v = a_index == 0.0 || a_index == 1.0 ? ${f(texCoord[1])} : ${f(texCoord[3])};
  v_texCoord = vec2(u, v);
  v_opacity = ${f(opacity)};
  v_color = vec4(${color.map(normalizeColor).map(f).join(', ')});
}`;

  return body;
}
