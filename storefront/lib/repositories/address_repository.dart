import '../core/network/api_exception.dart';
import '../core/network/http_client.dart';
import '../shared/models/address_model.dart';

class AddressRepository {
  final HttpClient _client;

  AddressRepository({required HttpClient client}) : _client = client;

  Future<List<AddressModel>> getAddresses() async {
    final body = await _client.get('/addresses');
    if (body == null || body['data'] is! List) {
      throw const ApiException('Failed to load addresses');
    }
    return (body['data'] as List<dynamic>)
        .map((e) => AddressModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<AddressModel> createAddress({
    required String fullName,
    required String phone,
    required String street,
    required String city,
    required String state,
    required String country,
    required String zipCode,
    bool isDefault = false,
  }) async {
    final body = await _client.post('/addresses', data: {
      'fullName': fullName,
      'phone': phone,
      'street': street,
      'city': city,
      'state': state,
      'country': country,
      'zipCode': zipCode,
      'isDefault': isDefault,
    });
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to create address');
    }
    return AddressModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<AddressModel> updateAddress(
    String id, {
    required String fullName,
    required String phone,
    required String street,
    required String city,
    required String state,
    required String country,
    required String zipCode,
  }) async {
    final body = await _client.put('/addresses/$id', data: {
      'fullName': fullName,
      'phone': phone,
      'street': street,
      'city': city,
      'state': state,
      'country': country,
      'zipCode': zipCode,
    });
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to update address');
    }
    return AddressModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<void> deleteAddress(String id) async {
    // The backend returns 204 No Content on success (null body).
    // DioHttpClient converts any non-2xx response to ApiException, so if
    // this call returns without throwing the delete succeeded.
    await _client.delete('/addresses/$id');
  }

  Future<AddressModel> setDefault(String id) async {
    final body = await _client.patch('/addresses/$id/default');
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to update default address');
    }
    return AddressModel.fromJson(body['data'] as Map<String, dynamic>);
  }
}
