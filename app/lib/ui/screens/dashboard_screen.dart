import 'package:flutter/material.dart';
import '../../application/snapshot_service.dart';
import '../../domain/field_identity.dart';
import '../../domain/models.dart';
import '../../theme/tokens.dart';
import '../widgets/result_card.dart';
import '../widgets/status_badge.dart';

/// Dashboard behavior:
/// hero copy changed from "latest verified" to "latest on-file";
/// a real Show all / Verified only filter now drives what's rendered
///; the vigilance "attach" action writes to a real
/// [VigilanceSelectionStore] instead of an empty callback.
class DashboardScreen extends StatefulWidget {
  final List<FieldSnapshotResult> snapshotResults;
  final FieldRegistry fieldRegistry;
  final List<RecordEntry> recentRecords;
  final VigilanceSelectionStore vigilanceStore;

  const DashboardScreen({
    super.key,
    required this.snapshotResults,
    required this.fieldRegistry,
    required this.recentRecords,
    required this.vigilanceStore,
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  RecordFilter _filter = RecordFilter.showAll; // default per / the product rules

  @override
  Widget build(BuildContext context) {
    // Filtering changes which results are shown, never how they're
    // labeled — labels stay permanent on whatever remains visible.
    final visibleResults = _filter == RecordFilter.showAll
        ? widget.snapshotResults
        : widget.snapshotResults
            .where((r) => r.mostRecentOnFile.verificationState.name == 'verified')
            .toList();

    return Scaffold(
      backgroundColor: HNColors.ivory50,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: 90),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'My HealthNote',
                    style: TextStyle(
                      fontFamily: HNType.uiFamily,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      color: HNColors.navy900,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: HNColors.mint400.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.lock, size: 12, color: HNColors.blueSlate),
                        SizedBox(width: 5),
                        Text('Stored on this device',
                            style: TextStyle(
                                fontFamily: HNType.uiFamily,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: HNColors.blueSlate)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [HNColors.navy850, HNColors.navy800],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(HNRadii.majorCard),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Current Health Snapshot',
                      style: TextStyle(
                          fontFamily: HNType.uiFamily,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: HNColors.ivory50)),
                  const SizedBox(height: 6),
                  // was "latest verified
                  // health information," which was inaccurate — the
                  // snapshot can and does surface unverified newest
                  // results.
                  const Text('Your latest on-file health information at a glance.',
                      style: TextStyle(fontSize: 12, color: HNColors.silver300)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {},
                    style: ElevatedButton.styleFrom(
                      backgroundColor: HNColors.mint400,
                      foregroundColor: HNColors.navy950,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(HNRadii.standard)),
                    ),
                    child: const Text('View latest summary',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Latest results',
                      style: TextStyle(
                          fontFamily: HNType.uiFamily,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: HNColors.navy900)),
                  _FilterToggle(
                    filter: _filter,
                    onChanged: (f) => setState(() => _filter = f),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),

            SizedBox(
              height: 178,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: visibleResults.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (context, i) {
                  final result = visibleResults[i];
                  final def = widget.fieldRegistry.definitionFor(result.fieldIdentity);
                  return ResultCard(
                    result: result,
                    categoryLabel: def?.displayName ?? result.fieldIdentity.canonicalKey,
                    onAttachVerified: () {
                      setState(() {
                        widget.vigilanceStore.attach(
                          result.fieldIdentity,
                          VigilanceContext.snapshot,
                        );
                      });
                    },
                    isAttached: widget.vigilanceStore
                        .isAttached(result.fieldIdentity, VigilanceContext.snapshot),
                  );
                },
              ),
            ),

            const SizedBox(height: 18),
            Center(
              child: Column(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [HNColors.teal500, HNColors.blueSlate],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                    child: const Icon(Icons.camera_alt, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  const Text('Capture',
                      style: TextStyle(
                          fontFamily: HNType.uiFamily,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: HNColors.navy900)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text('Recent records',
                      style: TextStyle(
                          fontFamily: HNType.uiFamily,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: HNColors.navy900)),
                  Text('View all ›',
                      style: TextStyle(
                          fontFamily: HNType.uiFamily,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: HNColors.teal500)),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: widget.recentRecords.map((r) => _RecentRecordCard(record: r)).toList(),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: HNColors.navy900,
        unselectedItemColor: HNColors.slate500,
        currentIndex: 0,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.archive_outlined), label: 'Archive'),
          BottomNavigationBarItem(icon: Icon(Icons.camera_alt_outlined), label: 'Capture'),
          BottomNavigationBarItem(icon: Icon(Icons.ios_share), label: 'Share'),
          BottomNavigationBarItem(icon: Icon(Icons.settings_outlined), label: 'Settings'),
        ],
      ),
    );
  }
}

class _FilterToggle extends StatelessWidget {
  final RecordFilter filter;
  final ValueChanged<RecordFilter> onChanged;
  const _FilterToggle({required this.filter, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget chip(String label, RecordFilter value) {
      final selected = filter == value;
      return GestureDetector(
        onTap: () => onChanged(value),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: selected ? HNColors.navy900 : Colors.transparent,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: HNColors.navy900.withOpacity(0.3)),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontFamily: HNType.uiFamily,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              color: selected ? Colors.white : HNColors.navy900,
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        chip('All', RecordFilter.showAll),
        const SizedBox(width: 6),
        chip('Verified only', RecordFilter.showVerifiedOnly),
      ],
    );
  }
}

class _RecentRecordCard extends StatelessWidget {
  final RecordEntry record;
  const _RecentRecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(HNRadii.standard),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 4)],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(record.fieldIdentity.canonicalKey,
                    style: const TextStyle(
                        fontFamily: HNType.uiFamily,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: HNColors.navy900)),
                const SizedBox(height: 2),
                Text('Control #${record.controlNumber}',
                    style: const TextStyle(fontSize: 11, color: HNColors.slate500)),
              ],
            ),
          ),
          StatusBadge(
            verificationState: record.verificationState,
            isBaseline: record.isBaseline,
          ),
        ],
      ),
    );
  }
}
