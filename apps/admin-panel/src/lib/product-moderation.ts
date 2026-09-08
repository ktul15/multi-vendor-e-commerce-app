export type ProductModerationAction = "activate" | "deactivate" | "delete";

export function actionsForProduct(
  product: Readonly<{ isActive: boolean }>,
): readonly ProductModerationAction[] {
  return product.isActive ? ["deactivate", "delete"] : ["activate", "delete"];
}
