/**
 * Lets plain Node resolve the extensionless relative imports Vite allows
 * (`./permissions` -> `./permissions.js`). Used only by the verify script.
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return next(`${specifier}.js`, context);
    }
    throw error;
  }
}
