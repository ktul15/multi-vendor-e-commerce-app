import { AdminCategoriesView } from "../../admin-categories-view";
import { getAdminCategories } from "../../../src/lib/category-data";

export default async function CategoriesPage() {
  let categories;
  try {
    categories = await getAdminCategories();
  } catch {
    return <AdminCategoriesView error="Categories could not be loaded. Try again." />;
  }
  return <AdminCategoriesView categories={categories} />;
}
