import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTextStyles {
  AppTextStyles._();

  static TextStyle get h1 =>
      GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.bold);

  static TextStyle get h2 =>
      GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold);

  static TextStyle get h3 =>
      GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600);

  static TextStyle get body1 =>
      GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.normal);

  static TextStyle get body2 =>
      GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.normal);

  static TextStyle get caption =>
      GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.normal);
}
