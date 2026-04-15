import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

sealed class ThemeState extends Equatable {
  const ThemeState();

  @override
  List<Object?> get props => [];
}

class ThemeLoaded extends ThemeState {
  final ThemeMode mode;

  const ThemeLoaded({required this.mode});

  @override
  List<Object?> get props => [mode];
}
