import { Text, TextInput, type TextInputProps, View } from 'react-native';

interface Props extends TextInputProps {
  label: string;
}

export function Field({ label, style, ...input }: Props): JSX.Element {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6, fontSize: 14, fontWeight: '500' }}>{label}</Text>
      <TextInput
        style={[
          {
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
          },
          style,
        ]}
        autoCapitalize="none"
        autoCorrect={false}
        {...input}
      />
    </View>
  );
}
