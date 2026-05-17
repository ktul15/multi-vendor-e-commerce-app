// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

import 'package:flutter/widgets.dart';

class DroppedImageFile {
  final String name;
  final Uint8List bytes;

  const DroppedImageFile({required this.name, required this.bytes});
}

class CategoryImageDropZone extends StatefulWidget {
  final Widget child;
  final ValueChanged<DroppedImageFile> onDropped;

  const CategoryImageDropZone({
    super.key,
    required this.child,
    required this.onDropped,
  });

  @override
  State<CategoryImageDropZone> createState() => _CategoryImageDropZoneState();
}

class _CategoryImageDropZoneState extends State<CategoryImageDropZone> {
  StreamSubscription<html.MouseEvent>? _dragOverSub;
  StreamSubscription<html.MouseEvent>? _dropSub;

  @override
  void initState() {
    super.initState();
    _dragOverSub = html.document.onDragOver.listen(_handleDragOver);
    _dropSub = html.document.onDrop.listen(_handleDrop);
  }

  @override
  void dispose() {
    _dragOverSub?.cancel();
    _dropSub?.cancel();
    super.dispose();
  }

  bool _containsPointer(html.MouseEvent event) {
    final box = context.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) return false;

    final origin = box.localToGlobal(Offset.zero);
    final size = box.size;
    final x = event.client.x.toDouble();
    final y = event.client.y.toDouble();

    return x >= origin.dx &&
        x <= origin.dx + size.width &&
        y >= origin.dy &&
        y <= origin.dy + size.height;
  }

  void _handleDragOver(html.MouseEvent event) {
    if (!_containsPointer(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  Future<void> _handleDrop(html.MouseEvent event) async {
    if (!_containsPointer(event)) return;
    event.preventDefault();

    final files = event.dataTransfer.files;
    if (files == null || files.isEmpty) return;

    final file = files.first;
    if (!file.type.startsWith('image/')) return;

    final reader = html.FileReader();
    reader.readAsArrayBuffer(file);
    await reader.onLoadEnd.first;

    final buffer = reader.result as ByteBuffer;
    widget.onDropped(
      DroppedImageFile(name: file.name, bytes: Uint8List.view(buffer)),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
