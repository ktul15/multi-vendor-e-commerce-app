import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/network/api_exception.dart';
import '../../../repositories/product_detail_repository.dart';
import '../../../shared/models/product_model.dart';
import 'product_detail_state.dart';

class ProductDetailCubit extends Cubit<ProductDetailState> {
  final ProductDetailRepository _repository;

  ProductDetailCubit({required ProductDetailRepository repository})
      : _repository = repository,
        super(const ProductDetailInitial());

  Future<void> loadProduct(String id) async {
    if (state is ProductDetailLoading) return;
    emit(const ProductDetailLoading());
    try {
      final product = await _repository.getProductById(id);
      emit(ProductDetailLoaded(product: product));
    } on ApiException catch (e) {
      emit(ProductDetailError(message: e.message, productId: id));
    } on NetworkException catch (e) {
      emit(ProductDetailError(message: e.message, productId: id));
    } catch (e) {
      emit(ProductDetailError(message: e.toString(), productId: id));
    }
  }

  void selectVariant(VariantModel? variant) {
    final current = state;
    if (current is! ProductDetailLoaded) return;
    emit(current.copyWith(
      selectedVariant: variant,
      clearVariant: variant == null,
    ));
  }
}
