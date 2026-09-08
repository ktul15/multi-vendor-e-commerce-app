import 'package:admin_panel/features/vendors/models/vendor_model.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('VendorModel.fromJson', () {
    test('parses string commission rates returned by Prisma decimals', () {
      final vendor = VendorModel.fromJson({
        'id': 'vendor-1',
        'storeName': 'Demo Store',
        'status': 'APPROVED',
        'commissionRate': '10.5',
        'paymentProvider': 'RAZORPAY',
        'settlementCountry': 'IN',
        'paymentOnboardingStatus': 'COMPLETED',
        'createdAt': '2026-05-18T10:00:00.000Z',
        'user': {
          'id': 'user-1',
          'name': 'Demo Owner',
          'email': 'owner@example.com',
          'isBanned': false,
        },
      });

      expect(vendor.commissionRate, 10.5);
    });

    test('keeps null commission rates as platform default', () {
      final vendor = VendorModel.fromJson({
        'id': 'vendor-1',
        'storeName': 'Demo Store',
        'status': 'PENDING',
        'commissionRate': null,
        'paymentProvider': 'STRIPE',
        'settlementCountry': 'US',
        'paymentOnboardingStatus': 'PENDING',
        'createdAt': '2026-05-18T10:00:00.000Z',
        'user': {
          'id': 'user-1',
          'name': 'Demo Owner',
          'email': 'owner@example.com',
          'isBanned': false,
        },
      });

      expect(vendor.commissionRate, isNull);
    });
  });
}
