import React, { useState } from 'react';
import { TextInput } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

interface PasswordInputProps extends Omit<React.ComponentProps<typeof TextInput>, 'right'> {}

const PasswordInput: React.FC<PasswordInputProps> = (props) => {
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const toggleSecureEntry = () => setSecureTextEntry(!secureTextEntry);

  return (
    <TextInput
      {...props}
      secureTextEntry={secureTextEntry}
      right={
        <TextInput.Icon
          icon={() => (
            <MaterialIcons
              name={secureTextEntry ? 'visibility-off' : 'visibility'}
              size={24}
              color="gray"
            />
          )}
          onPress={toggleSecureEntry}
        />
      }
    />
  );
};

export default PasswordInput;
