import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:healthnote/domain/enums.dart';
import 'package:healthnote/ui/widgets/status_badge.dart';

/// STATUS: written, unrun — see test/domain/record_entry_invariants_test.dart
/// header for why. `flutter test` on a real machine is required before
/// any of these are "passing tests" rather than "intended assertions."
void main() {
  Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

  testWidgets('StatusBadge shows VERIFIED for a verified, non-baseline record',
      (tester) async {
    await tester.pumpWidget(wrap(const StatusBadge(
      verificationState: VerificationState.verified,
      isBaseline: false,
    )));
    expect(find.text('VERIFIED'), findsOneWidget);
    expect(find.textContaining('BASELINE'), findsNothing);
  });

  testWidgets('StatusBadge shows UNVERIFIED · BASELINE composed label (§14 label composition)',
      (tester) async {
    await tester.pumpWidget(wrap(const StatusBadge(
      verificationState: VerificationState.unverified,
      isBaseline: true,
    )));
    expect(find.text('UNVERIFIED · BASELINE'), findsOneWidget);
  });

  testWidgets('StatusBadge shows VERIFIED · BASELINE composed label', (tester) async {
    await tester.pumpWidget(wrap(const StatusBadge(
      verificationState: VerificationState.verified,
      isBaseline: true,
    )));
    expect(find.text('VERIFIED · BASELINE'), findsOneWidget);
  });

  testWidgets('VigilancePrompt fires onAttach when tapped', (tester) async {
    var attached = false;
    await tester.pumpWidget(wrap(VigilancePrompt(onAttach: () => attached = true)));
    await tester.tap(find.text('Attach most recent verified info'));
    await tester.pump();
    expect(attached, isTrue);
  });
}
