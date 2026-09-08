#include <jni.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define TS_SIZE 188

static const uint8_t rsbox[256] = {
  0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
  0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
  0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
  0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
  0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
  0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
  0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
  0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
  0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
  0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
  0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
  0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
  0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
  0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
  0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
  0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
};

static const uint8_t sbox[256] = {
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
};

static const uint8_t rcon[11] =
    {0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36};

static uint8_t multiply(uint8_t x, uint8_t y) {
  uint8_t result = 0;
  while (y) {
    if (y & 1) result ^= x;
    x = (uint8_t)((x << 1) ^ ((x & 0x80) ? 0x1b : 0));
    y >>= 1;
  }
  return result;
}

static void expand_key(const uint8_t key[16], uint8_t round_key[176]) {
  int bytes = 16;
  int round = 1;
  uint8_t temp[4];
  memcpy(round_key, key, 16);
  while (bytes < 176) {
    int i;
    for (i = 0; i < 4; i++) temp[i] = round_key[bytes - 4 + i];
    if ((bytes & 15) == 0) {
      uint8_t first = temp[0];
      temp[0] = (uint8_t)(sbox[temp[1]] ^ rcon[round++]);
      temp[1] = sbox[temp[2]];
      temp[2] = sbox[temp[3]];
      temp[3] = sbox[first];
    }
    for (i = 0; i < 4; i++) {
      round_key[bytes] = (uint8_t)(round_key[bytes - 16] ^ temp[i]);
      bytes++;
    }
  }
}

static void add_round_key(uint8_t state[16], const uint8_t* key) {
  int i;
  for (i = 0; i < 16; i++) state[i] ^= key[i];
}

static void inv_shift_rows(uint8_t s[16]) {
  uint8_t t;
  t=s[13];s[13]=s[9];s[9]=s[5];s[5]=s[1];s[1]=t;
  t=s[2];s[2]=s[10];s[10]=t;t=s[6];s[6]=s[14];s[14]=t;
  t=s[3];s[3]=s[7];s[7]=s[11];s[11]=s[15];s[15]=t;
}

static void inv_sub_bytes(uint8_t s[16]) {
  int i;
  for (i = 0; i < 16; i++) s[i] = rsbox[s[i]];
}

static void inv_mix_columns(uint8_t s[16]) {
  int column;
  for (column = 0; column < 4; column++) {
    uint8_t* a = s + column * 4;
    uint8_t x0=a[0],x1=a[1],x2=a[2],x3=a[3];
    a[0]=(uint8_t)(multiply(x0,14)^multiply(x1,11)^multiply(x2,13)^multiply(x3,9));
    a[1]=(uint8_t)(multiply(x0,9)^multiply(x1,14)^multiply(x2,11)^multiply(x3,13));
    a[2]=(uint8_t)(multiply(x0,13)^multiply(x1,9)^multiply(x2,14)^multiply(x3,11));
    a[3]=(uint8_t)(multiply(x0,11)^multiply(x1,13)^multiply(x2,9)^multiply(x3,14));
  }
}

static void aes128_decrypt(uint8_t block[16], const uint8_t round_key[176]) {
  int round;
  add_round_key(block, round_key + 160);
  for (round = 9; round > 0; round--) {
    inv_shift_rows(block);
    inv_sub_bytes(block);
    add_round_key(block, round_key + round * 16);
    inv_mix_columns(block);
  }
  inv_shift_rows(block);
  inv_sub_bytes(block);
  add_round_key(block, round_key);
}

static int packet_payload_offset(const uint8_t* packet) {
  int control = (packet[3] >> 4) & 3;
  int offset = 4;
  if (control == 0 || control == 2) return -1;
  if (control == 3) offset += 1 + packet[4];
  return offset < TS_SIZE ? offset : -1;
}

static int process_pes(uint8_t* ts, size_t length, size_t first,
                       const uint8_t round_key[176], int blocks) {
  uint8_t* packet = ts + first;
  int pid = ((packet[1] & 0x1f) << 8) | packet[2];
  int offset = packet_payload_offset(packet);
  int extra;
  int flags;
  int marker;
  int algorithm;
  int header_length;
  size_t end;
  size_t payload_size = 0;
  size_t scan;
  uint8_t* payload;
  size_t copied = 0;
  size_t chunk;
  size_t decrypt_offset;
  size_t decrypt_bytes;
  uint8_t* saved;

  if (offset < 0 || offset + 20 >= TS_SIZE || packet[offset] != 0
      || packet[offset + 1] != 0 || packet[offset + 2] != 1) return 0;
  flags = packet[offset + 7];
  extra = (flags >> 6) == 2 ? 5 : (flags >> 6) == 3 ? 10
      : (flags & 32) ? 6 : (flags & 16) ? 3 : (flags & 8) ? 1
      : (flags & 4) ? 1 : (flags & 2) ? 2 : 0;
  if (offset + 19 + extra >= TS_SIZE) return 0;
  marker = packet[offset + 9 + extra];
  algorithm = packet[offset + 19 + extra] & 0x3f;
  if (!(marker & 0x80) || !(packet[offset + 19 + extra] & 0xc0)) return 0;
  if (algorithm != 2) return -1;
  header_length = 9 + packet[offset + 8];
  if (offset + header_length > TS_SIZE) return -1;

  end = length;
  for (scan = first + TS_SIZE; scan + TS_SIZE <= length; scan += TS_SIZE) {
    uint8_t* next = ts + scan;
    int next_pid;
    if (next[0] != 0x47) return -1;
    next_pid = ((next[1] & 0x1f) << 8) | next[2];
    if (next_pid == pid && (next[1] & 0x40)) {
      end = scan;
      break;
    }
  }
  payload_size += TS_SIZE - offset - header_length;
  for (scan = first + TS_SIZE; scan < end; scan += TS_SIZE) {
    uint8_t* next = ts + scan;
    int next_pid = ((next[1] & 0x1f) << 8) | next[2];
    int next_offset;
    if (next_pid != pid) continue;
    next_offset = packet_payload_offset(next);
    if (next_offset >= 0) payload_size += TS_SIZE - next_offset;
  }
  if (payload_size < 16 || blocks < 4 || (size_t)blocks > payload_size) return -1;
  payload = (uint8_t*)malloc(payload_size);
  if (payload == NULL) return -1;
  memcpy(payload, packet + offset + header_length,
         TS_SIZE - offset - header_length);
  copied = TS_SIZE - offset - header_length;
  for (scan = first + TS_SIZE; scan < end; scan += TS_SIZE) {
    uint8_t* next = ts + scan;
    int next_pid = ((next[1] & 0x1f) << 8) | next[2];
    int next_offset;
    if (next_pid != pid) continue;
    next_offset = packet_payload_offset(next);
    if (next_offset >= 0) {
      memcpy(payload + copied, next + next_offset, TS_SIZE - next_offset);
      copied += TS_SIZE - next_offset;
    }
  }

  chunk = payload_size / (size_t)blocks;
  decrypt_offset = chunk / 2;
  decrypt_bytes = ((payload_size - decrypt_offset - 1) / 16) * 16;
  for (scan = 0; scan < decrypt_bytes; scan += 16) {
    aes128_decrypt(payload + decrypt_offset + scan, round_key);
  }
  saved = (uint8_t*)malloc(chunk);
  if (saved == NULL) {
    free(payload);
    return -1;
  }
  memcpy(saved, payload + (size_t)(blocks - 1) * chunk, chunk);
  memmove(payload + 2 * chunk, payload + chunk, (size_t)(blocks - 2) * chunk);
  memcpy(payload + chunk, saved, chunk);
  free(saved);

  memcpy(packet + offset + header_length, payload,
         TS_SIZE - offset - header_length);
  copied = TS_SIZE - offset - header_length;
  for (scan = first + TS_SIZE; scan < end; scan += TS_SIZE) {
    uint8_t* next = ts + scan;
    int next_pid = ((next[1] & 0x1f) << 8) | next[2];
    int next_offset;
    if (next_pid != pid) continue;
    next_offset = packet_payload_offset(next);
    if (next_offset >= 0) {
      memcpy(next + next_offset, payload + copied, TS_SIZE - next_offset);
      copied += TS_SIZE - next_offset;
    }
  }
  free(payload);
  return 1;
}

static int hex_nibble(char value) {
  if (value >= '0' && value <= '9') return value - '0';
  if (value >= 'a' && value <= 'f') return value - 'a' + 10;
  if (value >= 'A' && value <= 'F') return value - 'A' + 10;
  return -1;
}

JNIEXPORT jboolean JNICALL
Java_com_bu_cc_tv_NativeCjsTransformer_nativeTransformInPlace(
    JNIEnv* env, jclass type, jbyteArray input, jstring transformer,
    jobjectArray arguments) {
  jbyte* bytes;
  const char* transformer_chars;
  jstring key_string;
  jstring blocks_string;
  const char* key_chars;
  const char* blocks_chars;
  jsize length;
  uint8_t aes_key[16];
  int blocks;
  int key_index;
  uint8_t round_key[176];
  size_t offset;
  int decrypted = 0;
  (void)type;
  if (input == NULL || transformer == NULL || arguments == NULL
      || (*env)->GetArrayLength(env, arguments) < 2) return JNI_FALSE;
  transformer_chars = (*env)->GetStringUTFChars(env, transformer, NULL);
  if (transformer_chars == NULL) return JNI_FALSE;
  if (strcmp(transformer_chars, "gxtv-xhls-v2") != 0) {
    (*env)->ReleaseStringUTFChars(env, transformer, transformer_chars);
    return JNI_FALSE;
  }
  (*env)->ReleaseStringUTFChars(env, transformer, transformer_chars);
  key_string = (jstring)(*env)->GetObjectArrayElement(env, arguments, 0);
  blocks_string = (jstring)(*env)->GetObjectArrayElement(env, arguments, 1);
  if (key_string == NULL || blocks_string == NULL) return JNI_FALSE;
  key_chars = (*env)->GetStringUTFChars(env, key_string, NULL);
  blocks_chars = (*env)->GetStringUTFChars(env, blocks_string, NULL);
  if (key_chars == NULL || blocks_chars == NULL || strlen(key_chars) != 32) {
    if (key_chars != NULL) (*env)->ReleaseStringUTFChars(env, key_string, key_chars);
    if (blocks_chars != NULL) (*env)->ReleaseStringUTFChars(env, blocks_string, blocks_chars);
    (*env)->DeleteLocalRef(env, key_string);
    (*env)->DeleteLocalRef(env, blocks_string);
    return JNI_FALSE;
  }
  for (key_index = 0; key_index < 16; key_index++) {
    int high = hex_nibble(key_chars[key_index * 2]);
    int low = hex_nibble(key_chars[key_index * 2 + 1]);
    if (high < 0 || low < 0) {
      (*env)->ReleaseStringUTFChars(env, key_string, key_chars);
      (*env)->ReleaseStringUTFChars(env, blocks_string, blocks_chars);
      (*env)->DeleteLocalRef(env, key_string);
      (*env)->DeleteLocalRef(env, blocks_string);
      return JNI_FALSE;
    }
    aes_key[key_index] = (uint8_t)((high << 4) | low);
  }
  blocks = atoi(blocks_chars);
  (*env)->ReleaseStringUTFChars(env, key_string, key_chars);
  (*env)->ReleaseStringUTFChars(env, blocks_string, blocks_chars);
  (*env)->DeleteLocalRef(env, key_string);
  (*env)->DeleteLocalRef(env, blocks_string);
  if (blocks < 4 || blocks > 31) return JNI_FALSE;
  length = (*env)->GetArrayLength(env, input);
  if (length < TS_SIZE || length % TS_SIZE != 0) return JNI_FALSE;
  bytes = (*env)->GetByteArrayElements(env, input, NULL);
  if (bytes == NULL) {
    if (bytes != NULL) (*env)->ReleaseByteArrayElements(env, input, bytes, JNI_ABORT);
    return JNI_FALSE;
  }
  expand_key(aes_key, round_key);
  memset(aes_key, 0, sizeof(aes_key));
  for (offset = 0; offset + TS_SIZE <= (size_t)length; offset += TS_SIZE) {
    uint8_t* packet = (uint8_t*)bytes + offset;
    int payload;
    int result;
    if (packet[0] != 0x47) {
      (*env)->ReleaseByteArrayElements(env, input, bytes, JNI_ABORT);
      return JNI_FALSE;
    }
    if (!(packet[1] & 0x40)) continue;
    payload = packet_payload_offset(packet);
    if (payload < 0 || payload + 3 >= TS_SIZE
        || packet[payload] != 0 || packet[payload + 1] != 0
        || packet[payload + 2] != 1) continue;
    result = process_pes((uint8_t*)bytes, (size_t)length, offset, round_key, blocks);
    if (result < 0) {
      (*env)->ReleaseByteArrayElements(env, input, bytes, JNI_ABORT);
      return JNI_FALSE;
    }
    decrypted += result;
  }
  memset(round_key, 0, sizeof(round_key));
  (*env)->ReleaseByteArrayElements(env, input, bytes, 0);
  return decrypted > 0 ? JNI_TRUE : JNI_FALSE;
}
