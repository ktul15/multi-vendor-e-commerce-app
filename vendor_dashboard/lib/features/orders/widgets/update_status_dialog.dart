import 'package:flutter/material.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/models/vendor_order.dart';

/// Valid forward-only status transitions (mirrors the backend's ALLOWED_TRANSITIONS).
const _allowedTransitions = <String, List<String>>{
  'PENDING': ['CONFIRMED'],
  'CONFIRMED': ['PROCESSING'],
  'PROCESSING': ['SHIPPED'],
  'SHIPPED': ['DELIVERED'],
};

class UpdateStatusDialog extends StatefulWidget {
  const UpdateStatusDialog({super.key, required this.order});

  final VendorOrder order;

  @override
  State<UpdateStatusDialog> createState() => _UpdateStatusDialogState();
}

class _UpdateStatusDialogState extends State<UpdateStatusDialog> {
  late String? _selectedStatus;
  final _trackingNumberCtrl = TextEditingController();
  final _trackingCarrierCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  List<String> get _nextStatuses =>
      _allowedTransitions[widget.order.status] ?? [];

  @override
  void initState() {
    super.initState();
    _selectedStatus = _nextStatuses.isNotEmpty ? _nextStatuses.first : null;
  }

  @override
  void dispose() {
    _trackingNumberCtrl.dispose();
    _trackingCarrierCtrl.dispose();
    super.dispose();
  }

  bool get _requiresTracking => _selectedStatus == 'SHIPPED';

  void _submit() {
    if (_formKey.currentState!.validate() && _selectedStatus != null) {
      final trackingNumber = _trackingNumberCtrl.text.trim();
      final trackingCarrier = _trackingCarrierCtrl.text.trim();
      Navigator.of(context).pop(StatusUpdateResult(
        status: _selectedStatus!,
        trackingNumber:
            (_requiresTracking && trackingNumber.isNotEmpty) ? trackingNumber : null,
        trackingCarrier:
            (_requiresTracking && trackingCarrier.isNotEmpty) ? trackingCarrier : null,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_nextStatuses.isEmpty) {
      return AlertDialog(
        title: const Text('Update Status'),
        content: Text(
          'Order "${widget.order.orderNumber}" is in a terminal status '
          '(${widget.order.status}) and cannot be updated further.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      );
    }

    return AlertDialog(
      title: Text('Update Order ${widget.order.orderNumber}'),
      content: SizedBox(
        width: 400,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _selectedStatus,
                decoration: const InputDecoration(labelText: 'New Status'),
                items: _nextStatuses
                    .map(
                      (s) => DropdownMenuItem(value: s, child: Text(s)),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _selectedStatus = v),
              ),
              if (_requiresTracking) ...[
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _trackingNumberCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Tracking Number'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required for SHIPPED' : null,
                ),
                const SizedBox(height: AppSpacing.md),
                TextFormField(
                  controller: _trackingCarrierCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Carrier (e.g. FedEx)'),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Required for SHIPPED' : null,
                ),
              ],
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Update'),
        ),
      ],
    );
  }
}

class StatusUpdateResult {
  final String status;
  final String? trackingNumber;
  final String? trackingCarrier;

  const StatusUpdateResult({
    required this.status,
    this.trackingNumber,
    this.trackingCarrier,
  });
}
