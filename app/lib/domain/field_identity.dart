/// Normalized, stable field identity — see the architecture.
///
/// Replaces the earlier fixed enum, which could not distinguish
/// individual lab analytes/medications from each other (everything
/// non-standard fell into a single `labAnalyteOther` bucket, which
/// would have silently merged creatinine/hemoglobin/potassium baselines
/// and vigilance comparisons into one field). Identity here is a
/// canonical string key, not an enum value, so new fields register
/// without a schema migration.
class FieldIdentity {
  /// Stable canonical key. Never shown to the user directly and never
  /// changed once assigned — this is what baseline assignment, snapshot
  /// ranking, and vigilance pairing key off, not the display name.
  final String canonicalKey;

  const FieldIdentity(this.canonicalKey);

  @override
  bool operator ==(Object other) =>
      other is FieldIdentity && other.canonicalKey == canonicalKey;
  @override
  int get hashCode => canonicalKey.hashCode;
  @override
  String toString() => canonicalKey;
}

class FieldDefinition {
  final FieldIdentity identity;
  final String displayName;
  final List<String> validUnits;
  final String icon;
  final bool isCompoundMeasurement; // e.g. blood pressure: systolic+diastolic

  const FieldDefinition({
    required this.identity,
    required this.displayName,
    required this.validUnits,
    required this.icon,
    this.isCompoundMeasurement = false,
  });
}

/// Registry resolving canonical keys and aliases to a stable
/// [FieldIdentity]. Ships with a known set of fields and supports
/// runtime registration of new ones (a new lab analyte or medication
/// gets its own registry entry, never a generic "other" bucket).
///
/// Alias normalization ("LDL", "LDL-C", "LDL Cholesterol" -> the same
/// canonical key) lives here so every screen and service shares one
/// resolution path instead of each re-implementing matching logic.
class FieldRegistry {
  final Map<String, FieldDefinition> _byCanonicalKey = {};
  final Map<String, String> _aliasToCanonicalKey = {};

  FieldRegistry() {
    _registerBuiltins();
  }

  void register(FieldDefinition def, {List<String> aliases = const []}) {
    _byCanonicalKey[def.identity.canonicalKey] = def;
    for (final alias in aliases) {
      _aliasToCanonicalKey[_normalize(alias)] = def.identity.canonicalKey;
    }
    // A canonical key always resolves to itself.
    _aliasToCanonicalKey[_normalize(def.identity.canonicalKey)] =
        def.identity.canonicalKey;
  }

  /// Resolves a raw label (from OCR, manual entry, or an import feed)
  /// to a stable [FieldIdentity], or null if nothing matches — callers
  /// must handle "unknown field" explicitly (e.g. by prompting the user
  /// to register a new field) rather than falling back to a generic
  /// bucket.
  FieldIdentity? resolve(String rawLabel) {
    final key = _aliasToCanonicalKey[_normalize(rawLabel)];
    return key == null ? null : FieldIdentity(key);
  }

  FieldDefinition? definitionFor(FieldIdentity identity) =>
      _byCanonicalKey[identity.canonicalKey];

  String _normalize(String s) => s.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');

  void _registerBuiltins() {
    register(
      const FieldDefinition(
        identity: FieldIdentity('blood_glucose'),
        displayName: 'Blood glucose',
        validUnits: ['mg/dL', 'mmol/L'],
        icon: 'droplet',
      ),
      aliases: ['glucose', 'blood sugar'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('blood_pressure'),
        displayName: 'Blood pressure',
        validUnits: ['mmHg'],
        icon: 'heart',
        isCompoundMeasurement: true,
      ),
      aliases: ['bp'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('weight'),
        displayName: 'Weight',
        validUnits: ['kg', 'lb'],
        icon: 'scale',
      ),
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('hba1c'),
        displayName: 'HbA1c',
        validUnits: ['%'],
        icon: 'droplet',
      ),
      aliases: ['a1c', 'glycated hemoglobin'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('heart_rate'),
        displayName: 'Heart rate',
        validUnits: ['bpm'],
        icon: 'heart',
      ),
      aliases: ['pulse'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('temperature'),
        displayName: 'Temperature',
        validUnits: ['°C', '°F'],
        icon: 'thermometer',
      ),
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('oxygen_saturation'),
        displayName: 'Oxygen saturation',
        validUnits: ['%'],
        icon: 'droplet',
      ),
      aliases: ['spo2', 'o2 sat'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('creatinine'),
        displayName: 'Creatinine',
        validUnits: ['mg/dL', 'µmol/L'],
        icon: 'lab',
      ),
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('hemoglobin'),
        displayName: 'Hemoglobin',
        validUnits: ['g/dL'],
        icon: 'lab',
      ),
      aliases: ['hgb', 'hb'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('potassium'),
        displayName: 'Potassium',
        validUnits: ['mmol/L'],
        icon: 'lab',
      ),
      aliases: ['k+'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('total_cholesterol'),
        displayName: 'Total cholesterol',
        validUnits: ['mg/dL', 'mmol/L'],
        icon: 'lab',
      ),
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('ldl_cholesterol'),
        displayName: 'LDL cholesterol',
        validUnits: ['mg/dL', 'mmol/L'],
        icon: 'lab',
      ),
      aliases: ['ldl', 'ldl-c'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('hdl_cholesterol'),
        displayName: 'HDL cholesterol',
        validUnits: ['mg/dL', 'mmol/L'],
        icon: 'lab',
      ),
      aliases: ['hdl', 'hdl-c'],
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('triglycerides'),
        displayName: 'Triglycerides',
        validUnits: ['mg/dL', 'mmol/L'],
        icon: 'lab',
      ),
    );
    register(
      const FieldDefinition(
        identity: FieldIdentity('medication/metformin'),
        displayName: 'Metformin',
        validUnits: ['mg'],
        icon: 'prescription',
      ),
    );
    // Additional medications register the same way, one canonical key
    // per distinct medication — e.g. FieldIdentity('medication/lisinopril') —
    // rather than a shared "medicationOther" bucket.
  }
}
