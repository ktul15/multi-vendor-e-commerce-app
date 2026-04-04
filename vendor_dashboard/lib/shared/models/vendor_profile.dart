class VendorProfile {
  final String id;
  final String? storeName;
  final String? description;
  final String? logoUrl;
  final String? bannerUrl;
  final String approvalStatus;

  const VendorProfile({
    required this.id,
    this.storeName,
    this.description,
    this.logoUrl,
    this.bannerUrl,
    required this.approvalStatus,
  });

  factory VendorProfile.fromJson(Map<String, dynamic> json) {
    return VendorProfile(
      id: json['id'] as String,
      storeName: json['storeName'] as String?,
      description: json['description'] as String?,
      logoUrl: json['logoUrl'] as String?,
      bannerUrl: json['bannerUrl'] as String?,
      approvalStatus: json['approvalStatus'] as String? ?? 'PENDING',
    );
  }
}
