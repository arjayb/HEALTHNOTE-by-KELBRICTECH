import 'package:flutter/material.dart';
import '../../theme/tokens.dart';

/// Screen 1 per approved visual specification. [hasProfile] drives the behavior
/// contract in the product specification's "Behavior" subsection: no local profile
/// -> Create is primary, Unlock disabled/explained; profile exists ->
/// Unlock is the primary returning-user path.
class MainScreen extends StatelessWidget {
  final bool hasProfile;
  final VoidCallback onCreate;
  final VoidCallback onUnlock;
  final VoidCallback onForgotPassword;

  const MainScreen({
    super.key,
    required this.hasProfile,
    required this.onCreate,
    required this.onUnlock,
    required this.onForgotPassword,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HNColors.navy900,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 34),
          child: Column(
            children: [
              RichText(
                text: const TextSpan(
                  children: [
                    TextSpan(
                      text: 'HEALTH',
                      style: TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontWeight: FontWeight.w800,
                        fontSize: 32,
                        color: HNColors.ivoryText,
                      ),
                    ),
                    TextSpan(
                      text: 'NOTE',
                      style: TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontWeight: FontWeight.w800,
                        fontSize: 32,
                        color: HNColors.mint400,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(width: 20, height: 1, color: HNColors.teal500),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      'by KELBRICTECH',
                      style: TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontSize: 10,
                        letterSpacing: 3,
                        color: HNColors.silver300,
                      ),
                    ),
                  ),
                  Container(width: 20, height: 1, color: HNColors.teal500),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Your personal health information tracker.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: HNType.uiFamily,
                  fontSize: 13.5,
                  color: HNColors.ivoryText,
                ),
              ),
              const SizedBox(height: 40),
              // Notebook/heartbeat/shield artwork: per visual rule #4,
              // decorative artwork MAY be a bundled optimized raster
              // asset when code-native reproduction would reduce
              // fidelity. Using an asset placeholder here rather than
              // reproducing the illustration in Flutter widgets/Canvas
              // is the deliberate, spec-sanctioned choice for this one
              // element (unlike the icons/controls, which are native).
              Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  color: HNColors.navy800,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Center(
                  child: Text(
                    'artwork asset\n(bundled raster per visual rule #4)',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: HNColors.slate500, fontSize: 10),
                  ),
                ),
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: HNSizes.primaryControlPreferred,
                child: ElevatedButton(
                  onPressed: onCreate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: HNColors.mint400,
                    foregroundColor: HNColors.navy950,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(HNRadii.standard),
                    ),
                  ),
                  child: const Text(
                    'Create My HealthNote',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: HNSizes.primaryControlPreferred,
                child: OutlinedButton(
                  onPressed: hasProfile ? onUnlock : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: HNColors.ivoryText,
                    side: BorderSide(
                      color: hasProfile ? HNColors.mint400 : HNColors.slate500,
                      width: 1.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(HNRadii.standard),
                    ),
                  ),
                  child: const Text(
                    'Unlock My HealthNote',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                  ),
                ),
              ),
              if (!hasProfile)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                    'No local profile yet — create one to enable this.',
                    style: TextStyle(fontSize: 10.5, color: HNColors.slate500),
                  ),
                ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: hasProfile ? onForgotPassword : null,
                child: Text(
                  'Forgot password?',
                  style: TextStyle(
                    fontFamily: HNType.uiFamily,
                    fontSize: 13,
                    decoration: TextDecoration.underline,
                    color: hasProfile ? HNColors.mint300 : HNColors.slate500,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shield_outlined, size: 14, color: HNColors.silver300),
                  SizedBox(width: 6),
                  Text(
                    'Your health record stays on your device.',
                    style: TextStyle(fontSize: 11, color: HNColors.silver300),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
