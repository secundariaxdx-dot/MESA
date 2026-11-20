/** Rutas de receta y modo cocina. Usan query params para poder exportarse como sitio estático. */
export const recipeHref = (recipeId: string, mealId?: string) => `/receta?r=${recipeId}${mealId ? `&m=${mealId}` : ""}`;
export const cookHref = (recipeId: string, mealId?: string) => `/cocinar?r=${recipeId}${mealId ? `&m=${mealId}` : ""}`;
