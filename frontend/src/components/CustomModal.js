import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export default function CustomModal({
  visible,
  onClose,
  title,
  message,
  buttons = [],
  icon = null,
  iconColor = '#00f5ff'
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
      }}>
        <View style={{
          backgroundColor: '#1a1d2e',
          borderRadius: 24,
          width: '100%',
          maxWidth: 400,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          {/* En-tête avec icône */}
          {icon && (
            <View style={{
              alignItems: 'center',
              paddingTop: 32,
              paddingBottom: 16
            }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}>
                <Ionicons name={icon} size={48} color={iconColor} />
              </View>
            </View>
          )}

          {/* Contenu */}
          <View style={{ padding: 24 }}>
            {title && (
              <Text style={{
                color: '#f5f5f0',
                fontSize: 22,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 12
              }}>
                {title}
              </Text>
            )}

            {message && (
              <Text style={{
                color: '#a8a8a0',
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 24
              }}>
                {message}
              </Text>
            )}
          </View>

          {/* Boutons */}
          <View style={{
            flexDirection: buttons.length > 2 ? 'column' : 'row',
            gap: 12,
            padding: 24,
            paddingTop: 0
          }}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: buttons.length <= 2 ? 1 : undefined,
                  backgroundColor: button.style === 'primary' 
                    ? '#d4af37'
                    : button.style === 'destructive'
                    ? 'rgba(255, 68, 68, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: button.style === 'destructive'
                    ? 'rgba(255, 68, 68, 0.5)'
                    : 'rgba(255, 255, 255, 0.1)'
                }}
                onPress={() => {
                  button.onPress();
                  if (button.closeOnPress !== false) {
                    onClose();
                  }
                }}
              >
                <Text style={{
                  color: button.style === 'primary' 
                    ? '#1a1d2e'
                    : button.style === 'destructive'
                    ? '#ff4444'
                    : '#f5f5f0',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: 16
                }}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}