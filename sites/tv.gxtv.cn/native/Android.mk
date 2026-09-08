LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := gxtv
LOCAL_MODULE_FILENAME := gxtv
LOCAL_SRC_FILES := gxtv_xhls.c
LOCAL_CFLAGS := -O3 -DNDEBUG -std=c99 -fvisibility=hidden
LOCAL_LDLIBS := -llog
include $(BUILD_SHARED_LIBRARY)
