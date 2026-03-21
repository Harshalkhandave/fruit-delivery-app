import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Button, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { addressStyles } from '../style/addressStyle';
import { globalStyles } from '../style/globalStyle';
import NeptiMapPicker from './mapPicker'; // 🟢 Import your new Map component

interface AddressModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (addressData: {
    receiverName: string;
    receiverPhone: string;
    line1: string;
    line2: string;
    nearby: string;
    city: string;
    state: string;
    coords?: { latitude: number; longitude: number }; // 🟢 Added for GPS storage
  }) => void;
  initialData: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

type FormErrors = {
  fName: string;
  lName: string;
  phone: string;
  line1: string;
  line2: string;
};

type FormTouched = {
  fName: boolean;
  lName: boolean;
  phone: boolean;
  line1: boolean;
  line2: boolean;
};

export default function AddressModal({
  visible,
  onDismiss,
  onSave,
  initialData,
}: AddressModalProps) {
  const { t } = useTranslation();

  // ===== STATE =====
  const [fName, setFName] = useState('');
  const [lName, setLName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [nearby, setNearby] = useState('');
  
  // 🟢 Map specific states
  const [showMap, setShowMap] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [errors, setErrors] = useState<FormErrors>({
    fName: '', lName: '', phone: '', line1: '', line2: '',
  });

  const [touched, setTouched] = useState<FormTouched>({
    fName: false, lName: false, phone: false, line1: false, line2: false,
  });

  // ===== VALIDATION =====
  const validate = (): FormErrors => {
    const newErrors: FormErrors = { fName: '', lName: '', phone: '', line1: '', line2: '' };

    if (!fName.trim()) newErrors.fName = t('name_required');
    else if (!/^[A-Za-z\u0900-\u097F\s]+$/.test(fName)) newErrors.fName = t('only_letters');
    else if (fName.trim().length < 2) newErrors.fName = t('min_2_characters');

    if (!lName.trim()) newErrors.lName = t('name_required');
    else if (!/^[A-Za-z\u0900-\u097F\s]+$/.test(lName)) newErrors.lName = t('only_letters');
    else if (lName.trim().length < 2) newErrors.lName = t('min_2_characters');

    if (!phone.trim()) newErrors.phone = t('phone_required');
    else if (!/^[0-9]{10}$/.test(phone)) newErrors.phone = t('invalid_phone');

    if (!line1.trim()) newErrors.line1 = t('address_line_1_required');
    else if (line1.trim().length < 2) newErrors.line1 = t('address_line_1_min_5');

    if (!line2.trim()) newErrors.line2 = t('address_line_2_required');
    else if (line2.trim().length < 5) newErrors.line2 = t('address_line_2_min_5');

    return newErrors;
  };

  const isFormValid = () => {
    const validation = validate();
    // 🟢 Form is valid ONLY if fields are correct AND a location is pinned
    return Object.values(validation).every(err => err === '') && selectedCoords !== null;
  };

  useEffect(() => {
    if (visible) {
      setFName(initialData.firstName || '');
      setLName(initialData.lastName || '');
      setPhone(initialData.phone.replace(/^\+91/, '') || '');
      setLine1('');
      setLine2('');
      setNearby('');
      setShowMap(false);
      setSelectedCoords(null);
      setErrors({ fName: '', lName: '', phone: '', line1: '', line2: '' });
      setTouched({ fName: false, lName: false, phone: false, line1: false, line2: false });
    }
  }, [visible, initialData]);

  // ===== HANDLERS =====
  const handleChange = (field: keyof FormErrors | 'nearby', value: string) => {
    switch (field) {
      case 'fName': setFName(value); break;
      case 'lName': setLName(value); break;
      case 'phone': setPhone(value.replace(/\D/g, '')); break;
      case 'line1': setLine1(value); break;
      case 'line2': setLine2(value); break;
      case 'nearby': setNearby(value); break;
    }
    if (field !== 'nearby') setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleBlur = (field: keyof FormErrors) => {
    const validation = validate();
    setErrors(prev => ({ ...prev, [field]: validation[field] }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSave = () => {
    const validation = validate();
    setErrors(validation);
    setTouched({ fName: true, lName: true, phone: true, line1: true, line2: true });

    if (!Object.values(validation).every(e => e === '')) return;
    if (!selectedCoords) {
        Alert.alert(t('error'), t('please_pin_location'));
        return;
    }

    onSave({
      receiverName: `${fName.trim()} ${lName.trim()}`,
      receiverPhone: phone,
      line1: line1.trim(),
      line2: line2.trim(),
      nearby: nearby.trim(),
      city: 'Ahilyanagar',
      state: 'Maharashtra',
      coords: selectedCoords // 🟢 Send GPS data to Firestore
    });

    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={addressStyles.modalContainer}>
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <Text variant="titleLarge" style={addressStyles.modalTitle}>
            {t('add_delivery_address')}
          </Text>
          
          <Button 
            icon={selectedCoords ? "check-circle" : "map-marker-radius"} 
            mode="outlined" 
            onPress={() => setShowMap(true)}
            style={{ marginBottom: 15 }}
          >
            {selectedCoords ? t('location_pinned') : t('select_exact_location')}
          </Button>

          {/* Full Screen Overlay */}
          <NeptiMapPicker 
            visible={showMap}
            onCancel={() => setShowMap(false)}
            onLocationSelected={(coords: any) => {
              setSelectedCoords(coords);
              setShowMap(false);
            }}
          />
          {/* 🟢 MAP TOGGLE BUTTON
          <Button 
            icon={selectedCoords ? "check-circle" : "map-marker-radius"} 
            mode={selectedCoords ? "contained-tonal" : "outlined"} 
            onPress={() => setShowMap(!showMap)}
            style={{ marginBottom: 15 }}
          >
            {selectedCoords ? t('location_pinned') : t('select_exact_location')}
          </Button> */}

          {/* 🟢 CONDITIONAL MAP VIEW
          {showMap && (
            <View style={{ marginBottom: 20 }}>
              <NeptiMapPicker 
                onCancel={() => setShowMap(false)}
                onLocationSelected={(coords: any) => {
                  setSelectedCoords(coords);
                  setShowMap(false);
                }}
              />
            </View>
          )} */}

          {/* First + Last */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                label={`${t('first_name')} *`}
                value={fName}
                onChangeText={(t) => handleChange('fName', t)}
                onBlur={() => handleBlur('fName')}
                mode="outlined"
                style={globalStyles.input}
                error={touched.fName && !!errors.fName}
              />
              {touched.fName && !!errors.fName && <Text style={{ color: 'red', fontSize: 12 }}>{errors.fName}</Text>}
            </View>

            <View style={{ flex: 1 }}>
              <TextInput
                label={`${t('last_name')} *`}
                value={lName}
                onChangeText={(t) => handleChange('lName', t)}
                onBlur={() => handleBlur('lName')}
                mode="outlined"
                style={globalStyles.input}
                error={touched.lName && !!errors.lName}
              />
              {touched.lName && !!errors.lName && <Text style={{ color: 'red', fontSize: 12 }}>{errors.lName}</Text>}
            </View>
          </View>

          {/* Phone */}
          <TextInput
            label={`${t('mobile')} *`}
            value={phone}
            onChangeText={(t) => handleChange('phone', t)}
            onBlur={() => handleBlur('phone')}
            keyboardType="phone-pad"
            mode="outlined"
            style={globalStyles.input}
            error={touched.phone && !!errors.phone}
          />
          {touched.phone && !!errors.phone && <Text style={{ color: 'red', fontSize: 12 }}>{errors.phone}</Text>}

          {/* Address Line 1 */}
          <TextInput
            label={`${t('address_line_1')} *`}
            value={line1}
            onChangeText={(t) => handleChange('line1', t)}
            onBlur={() => handleBlur('line1')}
            mode="outlined"
            style={globalStyles.input}
            error={touched.line1 && !!errors.line1}
          />
          {touched.line1 && !!errors.line1 && <Text style={{ color: 'red', fontSize: 12 }}>{errors.line1}</Text>}

          {/* Address Line 2 */}
          <TextInput
            label={`${t('address_line_2')} *`}
            value={line2}
            onChangeText={(t) => handleChange('line2', t)}
            onBlur={() => handleBlur('line2')}
            mode="outlined"
            style={globalStyles.input}
            error={touched.line2 && !!errors.line2}
          />
          {touched.line2 && !!errors.line2 && <Text style={{ color: 'red', fontSize: 12 }}>{errors.line2}</Text>}

          {/* Nearby */}
          <TextInput
            label={t('nearby_optional')}
            value={nearby}
            onChangeText={(t) => handleChange('nearby', t)}
            mode="outlined"
            style={globalStyles.input}
          />

          {/* City + State */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <TextInput label={`${t('city')} *`} value="Ahilyanagar" disabled style={{ flex: 1 }} />
            <TextInput label={`${t('state')} *`} value="Maharashtra" disabled style={{ flex: 1 }} />
          </View>

          {/* Buttons */}
          <View style={addressStyles.row}>
            <Button mode="outlined" onPress={onDismiss} style={{ flex: 1, marginRight: 10 }}>
              {t('cancel')}
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSave} 
              disabled={!isFormValid()} 
              style={{ flex: 1 }}
            >
              {t('save_address')}
            </Button>
          </View>
        </KeyboardAwareScrollView>
      </Modal>
    </Portal>
  );
}