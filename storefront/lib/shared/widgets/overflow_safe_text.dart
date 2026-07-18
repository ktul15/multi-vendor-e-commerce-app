import 'package:flutter/material.dart';

/// One-line text for constrained metadata, breadcrumbs, table cells, and labels.
class SingleLineText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;

  const SingleLineText(this.text, {super.key, this.style, this.textAlign});

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: style,
    textAlign: textAlign,
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
  );
}

/// A bounded heading that remains readable without growing indefinitely.
class BoundedTitle extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final int maxLines;
  final TextAlign? textAlign;

  const BoundedTitle(
    this.text, {
    super.key,
    this.style,
    this.maxLines = 2,
    this.textAlign,
  });

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: style,
    textAlign: textAlign,
    maxLines: maxLines,
    overflow: TextOverflow.ellipsis,
  );
}

/// Displays label/value metadata horizontally when space permits and stacks it
/// on narrow screens or at large accessibility text scales.
class ResponsiveMetadataRow extends StatelessWidget {
  final String label;
  final String? value;
  final Widget? valueWidget;
  final TextStyle? labelStyle;
  final TextStyle? valueStyle;
  final double spacing;
  final double stackBreakpoint;

  const ResponsiveMetadataRow({
    super.key,
    required this.label,
    this.value,
    this.valueWidget,
    this.labelStyle,
    this.valueStyle,
    this.spacing = 8,
    this.stackBreakpoint = 320,
  }) : assert(value != null || valueWidget != null);

  @override
  Widget build(BuildContext context) {
    final labelWidget = SingleLineText(label, style: labelStyle);
    final resolvedValue =
        valueWidget ??
        SingleLineText(value!, style: valueStyle, textAlign: TextAlign.end);

    return LayoutBuilder(
      builder: (context, constraints) {
        final textScale = MediaQuery.textScalerOf(context).scale(1);
        final shouldStack =
            constraints.maxWidth < stackBreakpoint || textScale > 1.3;
        if (shouldStack) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              labelWidget,
              SizedBox(height: spacing / 2),
              Align(alignment: Alignment.centerLeft, child: resolvedValue),
            ],
          );
        }
        return Row(
          children: [
            Expanded(child: labelWidget),
            SizedBox(width: spacing),
            Flexible(
              child: Align(
                alignment: Alignment.centerRight,
                child: resolvedValue,
              ),
            ),
          ],
        );
      },
    );
  }
}

/// A page/card heading with an optional action that stacks on narrow layouts.
class ResponsiveActionHeader extends StatelessWidget {
  final String title;
  final Widget? action;
  final TextStyle? titleStyle;
  final double spacing;
  final double stackBreakpoint;

  const ResponsiveActionHeader({
    super.key,
    required this.title,
    this.action,
    this.titleStyle,
    this.spacing = 12,
    this.stackBreakpoint = 480,
  });

  @override
  Widget build(BuildContext context) {
    final titleWidget = BoundedTitle(title, style: titleStyle);
    if (action == null) return titleWidget;
    return LayoutBuilder(
      builder: (context, constraints) {
        final shouldStack =
            constraints.maxWidth < stackBreakpoint ||
            MediaQuery.textScalerOf(context).scale(1) > 1.3;
        if (shouldStack) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              titleWidget,
              SizedBox(height: spacing),
              action!,
            ],
          );
        }
        return Row(
          children: [
            Expanded(child: titleWidget),
            SizedBox(width: spacing),
            action!,
          ],
        );
      },
    );
  }
}

/// Bounded single-line text for DataTable cells and other intrinsic layouts.
class TableCellText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final double maxWidth;

  const TableCellText(this.text, {super.key, this.style, this.maxWidth = 200});

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: BoxConstraints(maxWidth: maxWidth),
    child: SingleLineText(text, style: style),
  );
}
