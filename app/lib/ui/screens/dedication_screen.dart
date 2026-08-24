import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/tokens.dart';

/// Screen 2 per approved visual specification: shown on first launch, before
/// profile creation. Verbatim copy, fade-in, tap-to-continue only
/// after a minimum display period, reduced-motion respected.
class DedicationScreen extends StatefulWidget {
  final VoidCallback onContinue;
  const DedicationScreen({super.key, required this.onContinue});

  @override
  State<DedicationScreen> createState() => _DedicationScreenState();
}

class _DedicationScreenState extends State<DedicationScreen> {
  bool _canAdvance = false;

  @override
  void initState() {
    super.initState();
    // Minimum display period before tap-to-continue activates — the
    // dedication must "remain readable long enough to register" per
    // the product specification, not be instantly skippable.
    Timer(const Duration(milliseconds: 1400), () {
      if (mounted) setState(() => _canAdvance = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.of(context).disableAnimations;

    return GestureDetector(
      onTap: () {
        if (_canAdvance) widget.onContinue();
      },
      child: Scaffold(
        backgroundColor: HNColors.navy950,
        body: SafeArea(
          child: Stack(
            children: [
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 30),
                  child: AnimatedOpacity(
                    opacity: 1,
                    duration: reduceMotion
                        ? Duration.zero
                        : const Duration(milliseconds: 1800),
                    curve: Curves.easeOut,
                    child: const Text(
                      'Everything\nlisted here,\nlives —\nHEALTHNOTE',
                      textAlign: TextAlign.center,
                      style: HNType.dedication,
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 34,
                child: Column(
                  children: [
                    const Text(
                      'HEALTHNOTE',
                      style: TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 4,
                        color: HNColors.ivoryText,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'by KELBRICTECH',
                      style: TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontSize: 9,
                        letterSpacing: 3,
                        color: HNColors.silver300.withOpacity(0.9),
                      ),
                    ),
                  ],
                ),
              ),
              if (_canAdvance)
                const Positioned(
                  left: 0,
                  right: 0,
                  bottom: 10,
                  child: Text(
                    'TAP TO CONTINUE',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: HNType.uiFamily,
                      fontSize: 10,
                      letterSpacing: 1.5,
                      color: HNColors.slate500,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
