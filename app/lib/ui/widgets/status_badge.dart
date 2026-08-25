import 'package:flutter/material.dart';
import '../../domain/enums.dart';
import '../../theme/tokens.dart';

/// Renders VERIFIED/UNVERIFIED, optionally combined with BASELINE.
/// Per the product rules and: this label must appear on every
/// user-facing surface a record shows up on, and verification/baseline
/// are separate properties that must not be collapsed into one field
/// — so this widget takes them as two independent booleans/enums
/// rather than one combined "status string" the caller has to parse.
class StatusBadge extends StatelessWidget {
  final VerificationState verificationState;
  final bool isBaseline;
  final bool compact;

  const StatusBadge({
    super.key,
    required this.verificationState,
    required this.isBaseline,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final verified = verificationState == VerificationState.verified;
    final label = isBaseline
        ? (verified ? 'VERIFIED · BASELINE' : 'UNVERIFIED · BASELINE')
        : (verified ? 'VERIFIED' : 'UNVERIFIED');
    final color = verified ? HNColors.mint400 : HNColors.unverifiedAmber;

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 6 : 8,
        vertical: compact ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.5), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: HNType.uiFamily,
          fontSize: compact ? 9 : 10.5,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

/// The "Attach most recent verified info" vigilance prompt —
/// the product rules. Shown whenever the newest on-file record for a
/// field is unverified and an older verified record exists. Presents
/// BOTH records side by side; never substitutes one for the other.
class VigilancePrompt extends StatelessWidget {
  final VoidCallback onAttach;

  const VigilancePrompt({super.key, required this.onAttach});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: HNColors.unverifiedAmber.withOpacity(0.08),
        borderRadius: BorderRadius.circular(HNRadii.standard),
        border: Border.all(color: HNColors.unverifiedAmber.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'The newest entry is unverified.',
            style: TextStyle(
              fontFamily: HNType.uiFamily,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: onAttach,
            style: TextButton.styleFrom(padding: EdgeInsets.zero),
            child: const Text(
              'Attach most recent verified info',
              style: TextStyle(
                fontFamily: HNType.uiFamily,
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: HNColors.verifiedBlue,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
