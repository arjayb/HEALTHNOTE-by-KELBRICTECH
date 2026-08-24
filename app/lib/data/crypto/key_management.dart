import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:cryptography/helpers.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Implements HEALTHNOTE_ARCHITECTURE.md §4.2 using the `cryptography`
/// package's actual API (AesGcm.with256bits, Argon2id) rather than
/// UnimplementedError stubs.
///
/// SECURITY STATUS — read this before trusting the module: AES-GCM
/// wrapping logic is present, but Argon2id parameters intentionally
/// remain unset and all key derivation calls fail closed until they are
/// benchmarked on target hardware. Dedicated known-answer, corrupted-
/// ciphertext, wrong-key, reset, and recovery tests are still required,
/// followed by independent security review, before real health data is
/// entrusted to the app.
class KeyManagement {
  final _secureStorage = const FlutterSecureStorage();

  // Argon2id parameters left as TODOs, not plausible-looking numbers —
  // benchmark on a representative mid-range Android target before
  // filling these in. Stating tuned values without benchmarking would
  // itself be an unverified claim.
  static const int _argon2MemoryCostKibTodo = -1; // TODO: benchmark
  static const int _argon2TimeCostTodo = -1; // TODO: benchmark
  static const int _argon2ParallelismTodo = -1; // TODO: benchmark

  Argon2id _argon2id() {
    if (_argon2MemoryCostKibTodo < 0 ||
        _argon2TimeCostTodo < 0 ||
        _argon2ParallelismTodo < 0) {
      throw StateError(
        'Argon2id parameters have not been benchmarked/set. Do not fill '
        'these with a guess — benchmark on target hardware first.',
      );
    }
    return Argon2id(
      memory: _argon2MemoryCostKibTodo,
      iterations: _argon2TimeCostTodo,
      parallelism: _argon2ParallelismTodo,
      hashLength: 32,
    );
  }

  Future<Uint8List> generateDek() async {
    final algorithm = AesGcm.with256bits();
    final key = await algorithm.newSecretKey();
    return Uint8List.fromList(await key.extractBytes());
  }

  Future<Uint8List> generateSalt({int lengthBytes = 16}) async {
    return randomBytes(lengthBytes);
  }

  Future<Uint8List> derivePasswordKey(String password, Uint8List salt) async {
    final secretKey = await _argon2id().deriveKeyFromPassword(
      password: password,
      nonce: salt,
    );
    return Uint8List.fromList(await secretKey.extractBytes());
  }

  /// Per approved specification §11: the recovery phrase is a HealthNote-specific
  /// recovery credential, not a wallet seed — BIP39 word generation
  /// happens in a separate onboarding-flow module (not written in this
  /// pass); this method only derives a key from an already-generated
  /// phrase, exactly as it would from a password.
  Future<Uint8List> deriveRecoveryKey(String recoveryPhrase, Uint8List salt) async {
    final secretKey = await _argon2id().deriveKeyFromPassword(
      password: recoveryPhrase,
      nonce: salt,
    );
    return Uint8List.fromList(await secretKey.extractBytes());
  }

  /// AES-256-GCM wrap. Returns nonce || ciphertext || MAC, concatenated
  /// and base64-friendly as raw bytes — the caller decides serialization
  /// (base64 for storage) at the boundary, this method stays in bytes.
  /// Nonce is freshly random per call, per AES-GCM's requirement that a
  /// (key, nonce) pair is never reused.
  Future<Uint8List> wrapDek(Uint8List dek, Uint8List wrappingKeyBytes) async {
    final algorithm = AesGcm.with256bits();
    final secretKey = SecretKey(wrappingKeyBytes);
    final nonce = algorithm.newNonce();
    final box = await algorithm.encrypt(dek, secretKey: secretKey, nonce: nonce);
    return Uint8List.fromList([...nonce, ...box.cipherText, ...box.mac.bytes]);
  }

  /// Inverse of [wrapDek]. Expects the same nonce||ciphertext||mac
  /// layout. Throws (propagating cryptography's own exception) on a
  /// wrong key or corrupted/tampered ciphertext — AES-GCM's
  /// authentication tag makes tamper detection automatic; this method
  /// deliberately does not swallow that exception, since silently
  /// returning garbage plaintext on a MAC failure would be far worse
  /// than a thrown error.
  Future<Uint8List> unwrapDek(Uint8List wrapped, Uint8List wrappingKeyBytes) async {
    final algorithm = AesGcm.with256bits();
    const nonceLength = 12; // AES-GCM standard nonce length
    const macLength = 16; // AES-GCM standard tag length
    final nonce = wrapped.sublist(0, nonceLength);
    final mac = wrapped.sublist(wrapped.length - macLength);
    final cipherText = wrapped.sublist(nonceLength, wrapped.length - macLength);

    final secretKey = SecretKey(wrappingKeyBytes);
    final box = SecretBox(cipherText, nonce: nonce, mac: Mac(mac));
    final plain = await algorithm.decrypt(box, secretKey: secretKey);
    return Uint8List.fromList(plain);
  }

  /// Password reset per §4.2: caller has already verified the identity
  /// gate (birthdate + security-answer hash, rate-limited — see
  /// PersistentRateLimiter below) and already unwrapped the DEK via
  /// the recovery-phrase or biometric path. This derives a NEW
  /// password key and rewraps the SAME dek — the dek itself never
  /// changes, so the archive is never re-encrypted.
  Future<Uint8List> rewrapDekWithNewPassword({
    required Uint8List dek,
    required String newPassword,
    required Uint8List newSalt,
  }) async {
    final newKey = await derivePasswordKey(newPassword, newSalt);
    return wrapDek(dek, newKey);
  }

  /// Salted Argon2id hash of the security answer, for the one-way
  /// identity-gate comparison only (§4.2: "never a decryption path").
  Future<String> hashSecurityAnswer(String answer, Uint8List salt) async {
    final key = await _argon2id().deriveKeyFromPassword(password: answer, nonce: salt);
    final bytes = await key.extractBytes();
    return base64Encode(bytes);
  }

  /// Reads a value from the platform-backed secure storage
  /// (Keystore-backed on Android via flutter_secure_storage) — used
  /// for the biometric-path key reference, never for raw DEK/PDK/RDK
  /// bytes, which stay in memory only while unlocked.
  Future<String?> readSecureRef(String key) => _secureStorage.read(key: key);
  Future<void> writeSecureRef(String key, String value) =>
      _secureStorage.write(key: key, value: value);
}

/// Persistent, tamper-resistant rate limiting per §4.3 — replaces the
/// earlier in-memory `RateLimiter`, which reset on every app restart
/// (scaffold review §9). State lives behind `flutter_secure_storage`, the same
/// protected boundary as the wrapped keys, not a plain preference file.
///
/// STATUS: written against flutter_secure_storage's API; device-level
/// behavior and persistence across process restarts still require tests.
/// "Tamper-resistant" here means "behind the OS keystore/keychain,"
/// which is a meaningfully weaker guarantee than a proper hardware
/// security module — worth being precise about rather than implying
/// this is un-defeatable on a rooted device.
class PersistentRateLimiter {
  final FlutterSecureStorage _storage;
  static const _countKey = 'hn_rl_failed_count';
  static const _lastAttemptKey = 'hn_rl_last_attempt_epoch_ms';
  static const _lockoutUntilKey = 'hn_rl_lockout_until_epoch_ms';

  PersistentRateLimiter({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<int> _failedCount() async {
    final raw = await _storage.read(key: _countKey);
    return raw == null ? 0 : int.tryParse(raw) ?? 0;
  }

  /// Returns the remaining lockout duration, or Duration.zero if an
  /// attempt may proceed now.
  Future<Duration> lockoutRemaining() async {
    final rawUntil = await _storage.read(key: _lockoutUntilKey);
    if (rawUntil == null) return Duration.zero;
    final until = DateTime.fromMillisecondsSinceEpoch(int.parse(rawUntil));
    final now = DateTime.now();
    return until.isAfter(now) ? until.difference(now) : Duration.zero;
  }

  /// Records a failed attempt, escalates the lockout window, and
  /// persists it — surviving process restart, unlike the earlier
  /// in-memory version.
  Future<void> recordFailedAttempt() async {
    final count = await _failedCount() + 1;
    await _storage.write(key: _countKey, value: '$count');
    await _storage.write(
      key: _lastAttemptKey,
      value: '${DateTime.now().millisecondsSinceEpoch}',
    );

    final seconds = (2 << (count - 1).clamp(0, 11)).clamp(1, 3600);
    final lockoutUntil = DateTime.now().add(Duration(seconds: seconds));
    await _storage.write(
      key: _lockoutUntilKey,
      value: '${lockoutUntil.millisecondsSinceEpoch}',
    );
  }

  Future<void> reset() async {
    await _storage.delete(key: _countKey);
    await _storage.delete(key: _lastAttemptKey);
    await _storage.delete(key: _lockoutUntilKey);
  }
}
