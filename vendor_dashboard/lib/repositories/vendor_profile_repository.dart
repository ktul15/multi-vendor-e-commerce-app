import 'package:dio/dio.dart';
import '../shared/models/vendor_profile.dart';

class VendorProfileRepository {
  final Dio _dio;

  VendorProfileRepository({required Dio dio}) : _dio = dio;

  Future<VendorProfile> getProfile() async {
    final response = await _dio.get('/vendor-profile/me');
    return VendorProfile.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }

  Future<VendorProfile> updateProfile({
    String? storeName,
    String? description,
  }) async {
    final body = <String, dynamic>{};
    if (storeName != null) body['storeName'] = storeName;
    if (description != null) body['description'] = description;

    final response = await _dio.put('/vendor-profile/me', data: body);
    return VendorProfile.fromJson(
      response.data['data'] as Map<String, dynamic>,
    );
  }
}
