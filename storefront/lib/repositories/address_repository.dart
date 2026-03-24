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

  Future<AddressModel> setDefault(String id) async {
    final body = await _client.patch('/addresses/$id/default');
    if (body == null || body['data'] is! Map) {
      throw const ApiException('Failed to update default address');
    }
    return AddressModel.fromJson(body['data'] as Map<String, dynamic>);
  }
}
