import 'dart:typed_data';

import 'package:flutter/widgets.dart';

class DroppedImageFile {
  final String name;
  final Uint8List bytes;

  const DroppedImageFile({required this.name, required this.bytes});
}

class CategoryImageDropZone extends StatelessWidget {
  final Widget child;
  final ValueChanged<DroppedImageFile> onDropped;

  const CategoryImageDropZone({
    super.key,
    required this.child,
    required this.onDropped,
  });

  @override
  Widget build(BuildContext context) => child;
}
