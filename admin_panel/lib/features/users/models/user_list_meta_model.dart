import 'package:equatable/equatable.dart';

class UserListMetaModel extends Equatable {
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  const UserListMetaModel({
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory UserListMetaModel.fromJson(Map<String, dynamic> json) {
    return UserListMetaModel(
      total: json['total'] as int,
      page: json['page'] as int,
      limit: json['limit'] as int,
      totalPages: json['totalPages'] as int,
    );
  }

  @override
  List<Object?> get props => [total, page, limit, totalPages];
}
