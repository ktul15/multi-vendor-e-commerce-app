import 'package:equatable/equatable.dart';

class AddressModel extends Equatable {
  final String id;
  final String userId;
  final String fullName;
  final String phone;
  final String street;
  final String city;
  final String state;
  final String country;
  final String zipCode;
  final bool isDefault;

  const AddressModel({
    required this.id,
    required this.userId,
    required this.fullName,
    required this.phone,
    required this.street,
    required this.city,
    required this.state,
    required this.country,
    required this.zipCode,
    required this.isDefault,
  });

  factory AddressModel.fromJson(Map<String, dynamic> json) {
    return AddressModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      fullName: json['fullName'] as String,
      phone: json['phone'] as String,
      street: json['street'] as String,
      city: json['city'] as String,
      state: json['state'] as String,
      country: json['country'] as String,
      zipCode: json['zipCode'] as String,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  String get singleLine => '$street, $city, $state $zipCode, $country';

  AddressModel copyWith({
    String? id,
    String? userId,
    String? fullName,
    String? phone,
    String? street,
    String? city,
    String? state,
    String? country,
    String? zipCode,
    bool? isDefault,
  }) {
    return AddressModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      street: street ?? this.street,
      city: city ?? this.city,
      state: state ?? this.state,
      country: country ?? this.country,
      zipCode: zipCode ?? this.zipCode,
      isDefault: isDefault ?? this.isDefault,
    );
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        fullName,
        phone,
        street,
        city,
        state,
        country,
        zipCode,
        isDefault,
      ];
}
