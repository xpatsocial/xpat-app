import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';

interface UseAvatarOptions {
  userId: string;
  onUploaded?: (publicUrl: string) => void;
}

export function useAvatar({ userId, onUploaded }: UseAvatarOptions) {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(async () => {
    // Show action sheet: gallery or camera
    Alert.alert('Profile Photo', 'Choose a source', [
      {
        text: 'Photo Library',
        onPress: () => launchPicker('library'),
      },
      {
        text: 'Take Photo',
        onPress: () => launchPicker('camera'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [userId]);

  async function launchPicker(source: 'library' | 'camera') {
    try {
      // Request permission
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = source === 'library'
        ? await ImagePicker.launchImageLibraryAsync(options)
        : await ImagePicker.launchCameraAsync(options);

      if (result.canceled || !result.assets?.[0]) return;

      setUploading(true);
      const asset = result.assets[0];

      // Compress to 500x500 JPEG
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );

      if (!manipulated.base64) {
        Alert.alert('Error', 'Failed to process image.');
        setUploading(false);
        return;
      }

      const filePath = `${userId}/avatar.jpg`;
      const contentType = 'image/jpeg';

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, decode(manipulated.base64), {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        setUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) {
        Alert.alert('Error', 'Photo uploaded but profile update failed.');
      } else {
        onUploaded?.(publicUrl);
      }

      setUploading(false);
    } catch (e: any) {
      console.error('[useAvatar] Error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setUploading(false);
    }
  }

  return { pickAndUpload, uploading };
}
