#!/usr/bin/env python3
"""
Generates KnitFlow.xcodeproj with both iOS and watchOS targets.

Run:  python3 generate_xcodeproj.py
Then: open KnitFlow.xcodeproj
      Select "KnitFlow (iOS)" scheme → choose an iPhone sim → ⌘R
      Select "KnitFlow Watch App" scheme → choose a paired Watch sim → ⌘R
"""

import os, uuid

BASE = os.path.dirname(os.path.abspath(__file__))

def uid():
    return uuid.uuid4().hex[:24].upper()

# ─────────────────────────────────────────────────────────────────────────────
# Object IDs
# ─────────────────────────────────────────────────────────────────────────────

# Project
PROJECT_ID                 = uid()
PROJECT_CFG_LIST           = uid()
PROJECT_CFG_DEBUG          = uid()
PROJECT_CFG_RELEASE        = uid()
MAIN_GROUP                 = uid()
PRODUCTS_GROUP             = uid()

# iOS target
IOS_TARGET                 = uid()
IOS_CFG_LIST               = uid()
IOS_CFG_DEBUG              = uid()
IOS_CFG_RELEASE            = uid()
IOS_SOURCES_PHASE          = uid()
IOS_RESOURCES_PHASE        = uid()
IOS_FRAMEWORKS_PHASE       = uid()
IOS_EMBED_WATCH_PHASE      = uid()
IOS_PRODUCT_REF            = uid()
IOS_INFO_REF               = uid()
IOS_ASSETS_REF             = uid()
IOS_ASSETS_BUILD           = uid()
IOS_EMBED_WATCH_BUILD_FILE = uid()   # build file for embedding Watch.app

# watchOS target
WATCH_TARGET               = uid()
WATCH_CFG_LIST             = uid()
WATCH_CFG_DEBUG            = uid()
WATCH_CFG_RELEASE          = uid()
WATCH_SOURCES_PHASE        = uid()
WATCH_RESOURCES_PHASE      = uid()
WATCH_FRAMEWORKS_PHASE     = uid()
WATCH_PRODUCT_REF          = uid()
WATCH_INFO_REF             = uid()
WATCH_ASSETS_REF           = uid()
WATCH_ASSETS_BUILD         = uid()
WATCH_DEPENDENCY           = uid()
WATCH_CONTAINER_PROXY      = uid()

# ─────────────────────────────────────────────────────────────────────────────
# Source files
# ─────────────────────────────────────────────────────────────────────────────

def make_src(name, path):
    return {"name": name, "path": path, "ref": uid(), "build": uid()}

IOS_SRCS = [
    make_src("App.swift",          "App.swift"),
    make_src("Models.swift",       "Models/Models.swift"),
    make_src("Storage.swift",      "Storage/Storage.swift"),
    make_src("TrackerView.swift",  "Views/TrackerView.swift"),
    make_src("EditorView.swift",   "Views/EditorView.swift"),
    make_src("WatchView.swift",    "Views/WatchView.swift"),
    make_src("Theme.swift",        "Views/Theme.swift"),
]

# Watch gets its own file refs (separate build entries, shared source paths)
WATCH_SRCS = [
    make_src("KnitFlowWatchApp.swift", "WatchApp/KnitFlowWatchApp.swift"),
    make_src("WatchView.swift",        "Views/WatchView.swift"),
    make_src("Models.swift",           "Models/Models.swift"),
    make_src("Theme.swift",            "Views/Theme.swift"),
]

# ─────────────────────────────────────────────────────────────────────────────
# pbxproj builder
# ─────────────────────────────────────────────────────────────────────────────

def pbxproj():
    L = []
    def w(*args): L.append("\t\t" + " ".join(args))
    def section(name): L.append(f"\n/* Begin {name} section */")
    def end(name):    L.append(f"/* End {name} section */")

    L.append("// !$*UTF8*$!")
    L.append("{")
    L.append("\tarchiveVersion = 1;")
    L.append("\tclasses = {};")
    L.append("\tobjectVersion = 56;")
    L.append("\tobjects = {")

    # ── PBXBuildFile ─────────────────────────────────────────────────────────
    section("PBXBuildFile")
    for s in IOS_SRCS:
        w(f'{s["build"]} /* {s["name"]} in Sources */ = {{isa = PBXBuildFile; fileRef = {s["ref"]}; }};')
    w(f'{IOS_ASSETS_BUILD} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {IOS_ASSETS_REF}; }};')
    # Embed Watch app in iOS bundle
    w(f'{IOS_EMBED_WATCH_BUILD_FILE} /* KnitFlow Watch App.app in Embed Watch Content */ = {{isa = PBXBuildFile; fileRef = {WATCH_PRODUCT_REF}; settings = {{ATTRIBUTES = (RemoveHeadersOnCopy, ); }}; }};')

    for s in WATCH_SRCS:
        w(f'{s["build"]} /* {s["name"]} in Sources */ = {{isa = PBXBuildFile; fileRef = {s["ref"]}; }};')
    w(f'{WATCH_ASSETS_BUILD} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {WATCH_ASSETS_REF}; }};')
    end("PBXBuildFile")

    # ── PBXContainerItemProxy ─────────────────────────────────────────────────
    section("PBXContainerItemProxy")
    w(f'{WATCH_CONTAINER_PROXY} /* PBXContainerItemProxy */ = {{')
    w(f'\tisa = PBXContainerItemProxy;')
    w(f'\tcontainerPortal = {PROJECT_ID} /* Project object */;')
    w(f'\tproxyType = 1;')
    w(f'\tremoteGlobalIDString = {WATCH_TARGET};')
    w(f'\tremoteInfo = "KnitFlow Watch App";')
    w(f'}};')
    end("PBXContainerItemProxy")

    # ── PBXCopyFilesBuildPhase (Embed Watch Content) ───────────────────────────
    section("PBXCopyFilesBuildPhase")
    w(f'{IOS_EMBED_WATCH_PHASE} /* Embed Watch Content */ = {{')
    w(f'\tisa = PBXCopyFilesBuildPhase;')
    w(f'\tbuildActionMask = 2147483647;')
    w(f'\tdstPath = "$(CONTENTS_FOLDER_PATH)/Watch";')
    w(f'\tdstSubfolderSpec = 16;')
    w(f'\tfiles = (')
    w(f'\t\t{IOS_EMBED_WATCH_BUILD_FILE} /* KnitFlow Watch App.app in Embed Watch Content */,')
    w(f'\t);')
    w(f'\tname = "Embed Watch Content";')
    w(f'\trunOnlyForDeploymentPostprocessing = 0;')
    w(f'}};')
    end("PBXCopyFilesBuildPhase")

    # ── PBXFileReference ──────────────────────────────────────────────────────
    section("PBXFileReference")
    for s in IOS_SRCS:
        w(f'{s["ref"]} /* {s["name"]} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = {s["name"]}; path = {s["path"]}; sourceTree = "<group>"; }};')
    w(f'{IOS_INFO_REF} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; }};')
    w(f'{IOS_ASSETS_REF} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; }};')
    w(f'{IOS_PRODUCT_REF} /* KnitFlow.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = KnitFlow.app; sourceTree = BUILT_PRODUCTS_DIR; }};')

    for s in WATCH_SRCS:
        w(f'{s["ref"]} /* {s["name"]} (Watch) */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = {s["name"]}; path = {s["path"]}; sourceTree = "<group>"; }};')
    w(f'{WATCH_INFO_REF} /* Watch Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = WatchApp/Info.plist; sourceTree = "<group>"; }};')
    w(f'{WATCH_ASSETS_REF} /* Watch Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = WatchApp/Assets.xcassets; sourceTree = "<group>"; }};')
    w(f'{WATCH_PRODUCT_REF} /* KnitFlow Watch App.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "KnitFlow Watch App.app"; sourceTree = BUILT_PRODUCTS_DIR; }};')
    end("PBXFileReference")

    # ── PBXFrameworksBuildPhase ───────────────────────────────────────────────
    section("PBXFrameworksBuildPhase")
    for phase_id, label in [(IOS_FRAMEWORKS_PHASE, "iOS"), (WATCH_FRAMEWORKS_PHASE, "Watch")]:
        w(f'{phase_id} /* Frameworks ({label}) */ = {{')
        w(f'\tisa = PBXFrameworksBuildPhase;')
        w(f'\tbuildActionMask = 2147483647;')
        w(f'\tfiles = ();')
        w(f'\trunOnlyForDeploymentPostprocessing = 0;')
        w(f'}};')
    end("PBXFrameworksBuildPhase")

    # ── PBXGroup ──────────────────────────────────────────────────────────────
    section("PBXGroup")
    # Main group
    w(f'{MAIN_GROUP} = {{')
    w(f'\tisa = PBXGroup;')
    w(f'\tchildren = (')
    for s in IOS_SRCS:
        w(f'\t\t{s["ref"]} /* {s["name"]} */,')
    for s in WATCH_SRCS:
        w(f'\t\t{s["ref"]} /* {s["name"]} (Watch) */,')
    w(f'\t\t{IOS_ASSETS_REF} /* Assets.xcassets */,')
    w(f'\t\t{IOS_INFO_REF} /* Info.plist */,')
    w(f'\t\t{WATCH_ASSETS_REF} /* Watch Assets.xcassets */,')
    w(f'\t\t{WATCH_INFO_REF} /* Watch Info.plist */,')
    w(f'\t\t{PRODUCTS_GROUP} /* Products */,')
    w(f'\t);')
    w(f'\tsourceTree = "<group>";')
    w(f'}};')
    # Products group
    w(f'{PRODUCTS_GROUP} /* Products */ = {{')
    w(f'\tisa = PBXGroup;')
    w(f'\tchildren = (')
    w(f'\t\t{IOS_PRODUCT_REF} /* KnitFlow.app */,')
    w(f'\t\t{WATCH_PRODUCT_REF} /* KnitFlow Watch App.app */,')
    w(f'\t);')
    w(f'\tname = Products;')
    w(f'\tsourceTree = "<group>";')
    w(f'}};')
    end("PBXGroup")

    # ── PBXNativeTarget ───────────────────────────────────────────────────────
    section("PBXNativeTarget")
    # iOS
    w(f'{IOS_TARGET} /* KnitFlow */ = {{')
    w(f'\tisa = PBXNativeTarget;')
    w(f'\tbuildConfigurationList = {IOS_CFG_LIST};')
    w(f'\tbuildPhases = (')
    w(f'\t\t{IOS_SOURCES_PHASE} /* Sources */,')
    w(f'\t\t{IOS_FRAMEWORKS_PHASE} /* Frameworks */,')
    w(f'\t\t{IOS_RESOURCES_PHASE} /* Resources */,')
    w(f'\t\t{IOS_EMBED_WATCH_PHASE} /* Embed Watch Content */,')
    w(f'\t);')
    w(f'\tbuildRules = ();')
    w(f'\tdependencies = (')
    w(f'\t\t{WATCH_DEPENDENCY} /* PBXTargetDependency */,')
    w(f'\t);')
    w(f'\tname = KnitFlow;')
    w(f'\tproductName = KnitFlow;')
    w(f'\tproductReference = {IOS_PRODUCT_REF} /* KnitFlow.app */;')
    w(f'\tproductType = "com.apple.product-type.application";')
    w(f'}};')
    # Watch
    w(f'{WATCH_TARGET} /* KnitFlow Watch App */ = {{')
    w(f'\tisa = PBXNativeTarget;')
    w(f'\tbuildConfigurationList = {WATCH_CFG_LIST};')
    w(f'\tbuildPhases = (')
    w(f'\t\t{WATCH_SOURCES_PHASE} /* Sources */,')
    w(f'\t\t{WATCH_FRAMEWORKS_PHASE} /* Frameworks */,')
    w(f'\t\t{WATCH_RESOURCES_PHASE} /* Resources */,')
    w(f'\t);')
    w(f'\tbuildRules = ();')
    w(f'\tdependencies = ();')
    w(f'\tname = "KnitFlow Watch App";')
    w(f'\tproductName = "KnitFlow Watch App";')
    w(f'\tproductReference = {WATCH_PRODUCT_REF} /* KnitFlow Watch App.app */;')
    w(f'\tproductType = "com.apple.product-type.application";')
    w(f'}};')
    end("PBXNativeTarget")

    # ── PBXProject ────────────────────────────────────────────────────────────
    section("PBXProject")
    w(f'{PROJECT_ID} /* Project object */ = {{')
    w(f'\tisa = PBXProject;')
    w(f'\tattributes = {{')
    w(f'\t\tBuildIndependentTargetsInParallel = 1;')
    w(f'\t\tLastSwiftUpdateCheck = 1600;')
    w(f'\t\tLastUpgradeCheck = 1600;')
    w(f'\t\tTargetAttributes = {{')
    w(f'\t\t\t{IOS_TARGET} = {{ CreatedOnToolsVersion = 16.0; }};')
    w(f'\t\t\t{WATCH_TARGET} = {{ CreatedOnToolsVersion = 16.0; }};')
    w(f'\t\t}};')
    w(f'\t}};')
    w(f'\tbuildConfigurationList = {PROJECT_CFG_LIST};')
    w(f'\tcompatibilityVersion = "Xcode 14.0";')
    w(f'\tdevelopmentRegion = en;')
    w(f'\thasScannedForEncodings = 0;')
    w(f'\tknownRegions = (en, Base);')
    w(f'\tmainGroup = {MAIN_GROUP};')
    w(f'\tproductRefGroup = {PRODUCTS_GROUP} /* Products */;')
    w(f'\tprojectDirPath = "";')
    w(f'\tprojectRoot = "";')
    w(f'\ttargets = (')
    w(f'\t\t{IOS_TARGET} /* KnitFlow */,')
    w(f'\t\t{WATCH_TARGET} /* KnitFlow Watch App */,')
    w(f'\t);')
    w(f'}};')
    end("PBXProject")

    # ── PBXResourcesBuildPhase ────────────────────────────────────────────────
    section("PBXResourcesBuildPhase")
    w(f'{IOS_RESOURCES_PHASE} /* Resources (iOS) */ = {{')
    w(f'\tisa = PBXResourcesBuildPhase;')
    w(f'\tbuildActionMask = 2147483647;')
    w(f'\tfiles = ({IOS_ASSETS_BUILD} /* Assets.xcassets in Resources */,);')
    w(f'\trunOnlyForDeploymentPostprocessing = 0;')
    w(f'}};')
    w(f'{WATCH_RESOURCES_PHASE} /* Resources (Watch) */ = {{')
    w(f'\tisa = PBXResourcesBuildPhase;')
    w(f'\tbuildActionMask = 2147483647;')
    w(f'\tfiles = ({WATCH_ASSETS_BUILD} /* Assets.xcassets in Resources */,);')
    w(f'\trunOnlyForDeploymentPostprocessing = 0;')
    w(f'}};')
    end("PBXResourcesBuildPhase")

    # ── PBXSourcesBuildPhase ──────────────────────────────────────────────────
    section("PBXSourcesBuildPhase")
    w(f'{IOS_SOURCES_PHASE} /* Sources (iOS) */ = {{')
    w(f'\tisa = PBXSourcesBuildPhase;')
    w(f'\tbuildActionMask = 2147483647;')
    w(f'\tfiles = (')
    for s in IOS_SRCS:
        w(f'\t\t{s["build"]} /* {s["name"]} in Sources */,')
    w(f'\t);')
    w(f'\trunOnlyForDeploymentPostprocessing = 0;')
    w(f'}};')
    w(f'{WATCH_SOURCES_PHASE} /* Sources (Watch) */ = {{')
    w(f'\tisa = PBXSourcesBuildPhase;')
    w(f'\tbuildActionMask = 2147483647;')
    w(f'\tfiles = (')
    for s in WATCH_SRCS:
        w(f'\t\t{s["build"]} /* {s["name"]} in Sources */,')
    w(f'\t);')
    w(f'\trunOnlyForDeploymentPostprocessing = 0;')
    w(f'}};')
    end("PBXSourcesBuildPhase")

    # ── PBXTargetDependency ───────────────────────────────────────────────────
    section("PBXTargetDependency")
    w(f'{WATCH_DEPENDENCY} /* PBXTargetDependency */ = {{')
    w(f'\tisa = PBXTargetDependency;')
    w(f'\ttarget = {WATCH_TARGET} /* KnitFlow Watch App */;')
    w(f'\ttargetProxy = {WATCH_CONTAINER_PROXY} /* PBXContainerItemProxy */;')
    w(f'}};')
    end("PBXTargetDependency")

    # ── XCBuildConfiguration ──────────────────────────────────────────────────
    section("XCBuildConfiguration")

    # Shared project-level settings
    proj_common = {
        "ALWAYS_SEARCH_USER_PATHS": "NO",
        "CLANG_ANALYZER_NONNULL": "YES",
        "CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION": "YES_AGGRESSIVE",
        "CLANG_CXX_LANGUAGE_STANDARD": '"gnu++20"',
        "CLANG_ENABLE_MODULES": "YES",
        "CLANG_ENABLE_OBJC_ARC": "YES",
        "CLANG_ENABLE_OBJC_WEAK": "YES",
        "CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING": "YES",
        "CLANG_WARN_BOOL_CONVERSION": "YES",
        "CLANG_WARN_COMMA": "YES",
        "CLANG_WARN_CONSTANT_CONVERSION": "YES",
        "CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS": "YES",
        "CLANG_WARN_DIRECT_OBJC_ISA_USAGE": "YES_ERROR",
        "CLANG_WARN_DOCUMENTATION_COMMENTS": "YES",
        "CLANG_WARN_EMPTY_BODY": "YES",
        "CLANG_WARN_ENUM_CONVERSION": "YES",
        "CLANG_WARN_INFINITE_RECURSION": "YES",
        "CLANG_WARN_INT_CONVERSION": "YES",
        "CLANG_WARN_NON_LITERAL_NULL_CONVERSION": "YES",
        "CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF": "YES",
        "CLANG_WARN_OBJC_LITERAL_CONVERSION": "YES",
        "CLANG_WARN_OBJC_ROOT_CLASS": "YES_ERROR",
        "CLANG_WARN_RANGE_LOOP_ANALYSIS": "YES",
        "CLANG_WARN_SUSPICIOUS_MOVE": "YES",
        "CLANG_WARN_UNGUARDED_AVAILABILITY": "YES_AGGRESSIVE",
        "CLANG_WARN_UNREACHABLE_CODE": "YES",
        "CLANG_WARN__DUPLICATE_METHOD_MATCH": "YES",
        "COPY_PHASE_STRIP": "NO",
        "ENABLE_STRICT_OBJC_MSGSEND": "YES",
        "GCC_C_LANGUAGE_STANDARD": "gnu17",
        "GCC_NO_COMMON_BLOCKS": "YES",
        "GCC_WARN_64_TO_32_BIT_CONVERSION": "YES",
        "GCC_WARN_ABOUT_RETURN_TYPE": "YES_ERROR",
        "GCC_WARN_UNDECLARED_SELECTOR": "YES",
        "GCC_WARN_UNINITIALIZED_AUTOS": "YES_AGGRESSIVE",
        "GCC_WARN_UNUSED_FUNCTION": "YES",
        "GCC_WARN_UNUSED_VARIABLE": "YES",
        "SWIFT_EMIT_LOC_STRINGS": "YES",
    }

    def write_config(cfg_id, name, settings):
        w(f'{cfg_id} /* {name} */ = {{')
        w(f'\tisa = XCBuildConfiguration;')
        w(f'\tbuildSettings = {{')
        for k, v in settings.items():
            w(f'\t\t{k} = {v};')
        w(f'\t}};')
        w(f'\tname = {name};')
        w(f'}};')

    # Project Debug
    debug_proj = dict(proj_common)
    debug_proj.update({
        "DEBUG_INFORMATION_FORMAT": "dwarf",
        "ENABLE_TESTABILITY": "YES",
        "GCC_DYNAMIC_NO_PIC": "NO",
        "GCC_OPTIMIZATION_LEVEL": "0",
        'GCC_PREPROCESSOR_DEFINITIONS': '("DEBUG=1", "$(inherited)")',
        "MTL_ENABLE_DEBUG_INFO": "INCLUDE_SOURCE",
        "SWIFT_ACTIVE_COMPILATION_CONDITIONS": "DEBUG",
        "SWIFT_OPTIMIZATION_LEVEL": '"-Onone"',
    })
    write_config(PROJECT_CFG_DEBUG, "Debug", debug_proj)

    release_proj = dict(proj_common)
    release_proj.update({
        "DEBUG_INFORMATION_FORMAT": '"dwarf-with-dsym"',
        "ENABLE_NS_ASSERTIONS": "NO",
        "MTL_FAST_MATH": "YES",
        "SWIFT_COMPILATION_MODE": "wholemodule",
        "SWIFT_OPTIMIZATION_LEVEL": '"-O"',
        "VALIDATE_PRODUCT": "YES",
    })
    write_config(PROJECT_CFG_RELEASE, "Release", release_proj)

    # iOS target settings
    ios_common = {
        "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
        "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
        "CODE_SIGN_STYLE": "Automatic",
        "CURRENT_PROJECT_VERSION": "1",
        "GENERATE_INFOPLIST_FILE": "NO",
        "INFOPLIST_FILE": "Info.plist",
        "IPHONEOS_DEPLOYMENT_TARGET": "17.0",
        "LD_RUNPATH_SEARCH_PATHS": '("$(inherited)", "@executable_path/Frameworks")',
        "MARKETING_VERSION": "1.0",
        "PRODUCT_BUNDLE_IDENTIFIER": "com.knitflow.app",
        "PRODUCT_NAME": '"$(TARGET_NAME)"',
        "SDKROOT": "iphoneos",
        "SWIFT_EMIT_LOC_STRINGS": "YES",
        "SWIFT_VERSION": "5.0",
        "TARGETED_DEVICE_FAMILY": '"1,2"',
    }
    write_config(IOS_CFG_DEBUG,   "Debug",   ios_common)
    write_config(IOS_CFG_RELEASE, "Release", ios_common)

    # watchOS target settings
    watch_common = {
        "ASSETCATALOG_COMPILER_APPICON_NAME": "AppIcon",
        "ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME": "AccentColor",
        "CODE_SIGN_STYLE": "Automatic",
        "CURRENT_PROJECT_VERSION": "1",
        "GENERATE_INFOPLIST_FILE": "NO",
        "INFOPLIST_FILE": "WatchApp/Info.plist",
        "LD_RUNPATH_SEARCH_PATHS": '("$(inherited)", "@executable_path/Frameworks")',
        "MARKETING_VERSION": "1.0",
        "PRODUCT_BUNDLE_IDENTIFIER": "com.knitflow.app.watchkitapp",
        "PRODUCT_NAME": '"$(TARGET_NAME)"',
        "SDKROOT": "watchos",
        "SWIFT_EMIT_LOC_STRINGS": "YES",
        "SWIFT_VERSION": "5.0",
        "TARGETED_DEVICE_FAMILY": '"4"',
        "WATCHOS_DEPLOYMENT_TARGET": "10.0",
    }
    write_config(WATCH_CFG_DEBUG,   "Debug",   watch_common)
    write_config(WATCH_CFG_RELEASE, "Release", watch_common)

    end("XCBuildConfiguration")

    # ── XCConfigurationList ───────────────────────────────────────────────────
    section("XCConfigurationList")
    def write_cfg_list(list_id, owner, debug_id, release_id):
        w(f'{list_id} /* Build configuration list for {owner} */ = {{')
        w(f'\tisa = XCConfigurationList;')
        w(f'\tbuildConfigurations = ({debug_id} /* Debug */, {release_id} /* Release */,);')
        w(f'\tdefaultConfigurationIsVisible = 0;')
        w(f'\tdefaultConfigurationName = Release;')
        w(f'}};')

    write_cfg_list(PROJECT_CFG_LIST, 'PBXProject "KnitFlow"',           PROJECT_CFG_DEBUG,  PROJECT_CFG_RELEASE)
    write_cfg_list(IOS_CFG_LIST,     'PBXNativeTarget "KnitFlow"',       IOS_CFG_DEBUG,      IOS_CFG_RELEASE)
    write_cfg_list(WATCH_CFG_LIST,   'PBXNativeTarget "KnitFlow Watch App"', WATCH_CFG_DEBUG, WATCH_CFG_RELEASE)
    end("XCConfigurationList")

    L.append("\t};")
    L.append(f"\trootObject = {PROJECT_ID} /* Project object */;")
    L.append("}")
    return "\n".join(L)

# ─────────────────────────────────────────────────────────────────────────────
# Info.plist (iOS)
# ─────────────────────────────────────────────────────────────────────────────

IOS_INFO_PLIST = """\
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
    </dict>
    <key>UILaunchScreen</key>
    <dict/>
    <key>UIRequiredDeviceCapabilities</key>
    <array><string>armv7</string></array>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
    <key>UISupportedInterfaceOrientations~ipad</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationPortraitUpsideDown</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
"""

# ─────────────────────────────────────────────────────────────────────────────
# Write files
# ─────────────────────────────────────────────────────────────────────────────

PROJ_DIR  = os.path.join(BASE, "KnitFlow.xcodeproj")
PBXPROJ   = os.path.join(PROJ_DIR, "project.pbxproj")
WORKSPACE = os.path.join(PROJ_DIR, "project.xcworkspace")

os.makedirs(PROJ_DIR, exist_ok=True)
os.makedirs(WORKSPACE, exist_ok=True)

with open(PBXPROJ, "w") as f:
    f.write(pbxproj())
print(f"✅  {PBXPROJ}")

with open(os.path.join(WORKSPACE, "contents.xcworkspacedata"), "w") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<Workspace version = "1.0">\n   <FileRef location = "self:"></FileRef>\n</Workspace>\n')
print(f"✅  xcworkspace")

with open(os.path.join(BASE, "Info.plist"), "w") as f:
    f.write(IOS_INFO_PLIST)
print(f"✅  Info.plist (iOS)")

# iOS assets
for d in ["Assets.xcassets", "Assets.xcassets/AccentColor.colorset", "Assets.xcassets/AppIcon.appiconset"]:
    os.makedirs(os.path.join(BASE, d), exist_ok=True)
with open(os.path.join(BASE, "Assets.xcassets/Contents.json"), "w") as f:
    f.write('{"info":{"author":"xcode","version":1}}')

print()
print("🚀  Done! Run:")
print(f"    open {PROJ_DIR}")
print()
print("    iPhone:  select 'KnitFlow' scheme → pick an iPhone sim → ⌘R")
print("    Watch:   select 'KnitFlow Watch App' scheme → pick a Watch sim → ⌘R")
print("             (The Watch sim must be paired with the iPhone sim)")
