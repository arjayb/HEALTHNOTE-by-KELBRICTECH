import 'package:flutter/material.dart';

/// Design tokens transcribed directly from CLAUDE_HANDOFF.md.
/// Do not substitute Material defaults — see handoff rule #2.
class HNColors {
  static const navy950 = Color(0xFF020817);
  static const navy900 = Color(0xFF01122E);
  static const navy850 = Color(0xFF011936);
  static const navy800 = Color(0xFF0A2946);
  static const blueSlate = Color(0xFF285466);
  static const teal500 = Color(0xFF35AFAC);
  static const mint400 = Color(0xFF73CDB8);
  static const mint300 = Color(0xFF7DD9C1);
  static const ivory50 = Color(0xFFFDFBF8);
  static const ivoryText = Color(0xFFF3E6CF);
  static const silver300 = Color(0xFFAFC4CC);
  static const slate500 = Color(0xFF5E748B);
  static const verifiedBlue = Color(0xFF256BC5);

  // Semantic colors implied by compiled-006 (not in original handoff
  // palette — chosen to stay within the existing family rather than
  // introducing new brand colors). Flag for visual approval alongside
  // the rest of the UI, per user preference for design sign-off before
  // BUILD.
  static const unverifiedAmber = Color(0xFFC98A3A);
  static const baselineSilver = silver300;
}

class HNRadii {
  static const majorCard = 26.0; // 24-30dp per handoff
  static const standard = 18.0; // 16-22dp per handoff
}

class HNSpacing {
  static const grid = 4.0;
  static const gutterMin = 24.0;
  static const gutterMax = 32.0;
}

class HNType {
  // Prefer Inter for UI; platform-safe fallback per handoff.
  static const uiFamily = 'Inter';
  // Prefer Cormorant Garamond for dedication serif per handoff.
  static const dedicationFamily = 'Cormorant Garamond';

  static const wordmark = TextStyle(
    fontFamily: uiFamily,
    fontWeight: FontWeight.w800,
    fontSize: 34,
    letterSpacing: 0.5,
  );

  static const dedication = TextStyle(
    fontFamily: dedicationFamily,
    fontWeight: FontWeight.w500,
    fontSize: 26,
    height: 1.35,
    color: HNColors.ivoryText,
  );
}

/// Minimum control heights per handoff shape/elevation rules
/// (52dp min, 58-64dp preferred for primary controls).
class HNSizes {
  static const primaryControlMin = 52.0;
  static const primaryControlPreferred = 60.0;
}
