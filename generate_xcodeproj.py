#!/usr/bin/env python3
"""
Generates KnitFlow.xcodeproj from scratch.
Run: python3 generate_xcodeproj.py
Then: open KnitFlow.xcodeproj
"""

import os, uuid, textwrap

# ── Helpers ───────────────────────────────────────────────────────────────────

def new_id():
    """24-char uppercase hex Xcode object ID."""
    return uuid.uuid4().hex[:24].upper()

# ── Object IDs ────────────────────────────────────────────────────────────────

PROJECT_ID          = new_id()
TARGET_ID           = new_id()
BUILD_CONFIG_LIST_PROJECT = new_id()
BUILD_CONFIG_LIST_TARGET  = new_id()
CONFIG_DEBUG_PROJECT  = new_id()
CONFIG_RELEASE_PROJECT= new_id()
CONFIG_DEBUG_TARGET   = new_id()
CONFIG_RELEASE_TARGET = new_id()
SOURCES_PHASE_ID    = new_id()
RESOURCES_PHASE_ID  = new_id()
FRAMEWORKS_PHASE_ID = new_id()
MAIN_GROUP_ID       = new_id()
PRODUCTS_GROUP_ID   = new_id()
PRODUCT_REF_ID      = new_id()

# Source files: (display name, relative path from project root, file ref id, build file id)
SOURCES = [
    ("App.swift",          "App.swift"),
    ("Models.swift",       "Models/Models.swift"),
    ("Storage.swift",      "Storage/Storage.swift"),
    ("TrackerView.swift",  "Views/TrackerView.swift"),
    ("EditorView.swift",   "Views/EditorView.swift"),
    ("WatchView.swift",    "Views/WatchView.swift"),
    ("Theme.swift",        "Views/Theme.swift"),
]

source_entries = []
for name, path in SOURCES:
    source_entries.append({
        "name": name,
        "path": path,
        "file_ref_id": new_id(),
        "build_file_id": new_id(),
    })

INFO_PLIST_FILE_REF = new_id()
ASSETS_FILE_REF     = new_id()
ASSETS_BUILD_FILE   = new_id()

# ── Build the pbxproj content ─────────────────────────────────────────────────

def pbxproj():
    lines = []
    A = lines.append

    A("// !$*UTF8*$!")
    A("{")
    A("\tarchiveVersion = 1;")
    A("\tclasses = {")
    A("\t};")
    A("\tobjectVersion = 56;")
    A("\tobjects = {")
    A("")

    # ── PBXBuildFile ──────────────────────────────────────────────────────────
    A("/* Begin PBXBuildFile section */")
    for s in source_entries:
        A(f'\t\t{s["build_file_id"]} /* {s["name"]} in Sources */ = {{isa = PBXBuildFile; fileRef = {s["file_ref_id"]} /* {s["name"]} */; }};')
    A(f'\t\t{ASSETS_BUILD_FILE} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {ASSETS_FILE_REF} /* Assets.xcassets */; }};')
    A("/* End PBXBuildFile section */")
    A("")

    # ── PBXFileReference ──────────────────────────────────────────────────────
    A("/* Begin PBXFileReference section */")
    for s in source_entries:
        A(f'\t\t{s["file_ref_id"]} /* {s["name"]} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = {s["name"]}; path = {s["path"]}; sourceTree = "<group>"; }};')
    A(f'\t\t{INFO_PLIST_FILE_REF} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; }};')
    A(f'\t\t{ASSETS_FILE_REF} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; }};')
    A(f'\t\t{PRODUCT_REF_ID} /* KnitFlow.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = KnitFlow.app; sourceTree = BUILT_PRODUCTS_DIR; }};')
    A("/* End PBXFileReference section */")
    A("")

    # ── PBXFrameworksBuildPhase ───────────────────────────────────────────────
    A("/* Begin PBXFrameworksBuildPhase section */")
    A(f'\t\t{FRAMEWORKS_PHASE_ID} /* Frameworks */ = {{')
    A("\t\t\tisa = PBXFrameworksBuildPhase;")
    A("\t\t\tbuildActionMask = 2147483647;")
    A("\t\t\tfiles = (")
    A("\t\t\t);")
    A("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    A("\t\t};")
    A("/* End PBXFrameworksBuildPhase section */")
    A("")

    # ── PBXGroup ──────────────────────────────────────────────────────────────
    A("/* Begin PBXGroup section */")
    # Main group
    A(f'\t\t{MAIN_GROUP_ID} = {{')
    A("\t\t\tisa = PBXGroup;")
    A("\t\t\tchildren = (")
    for s in source_entries:
        A(f'\t\t\t\t{s["file_ref_id"]} /* {s["name"]} */,')
    A(f'\t\t\t\t{ASSETS_FILE_REF} /* Assets.xcassets */,')
    A(f'\t\t\t\t{INFO_PLIST_FILE_REF} /* Info.plist */,')
    A(f'\t\t\t\t{PRODUCTS_GROUP_ID} /* Products */,')
    A("\t\t\t);")
    A("\t\t\tsourceTree = \"<group>\";")
    A("\t\t};")
    # Products group
    A(f'\t\t{PRODUCTS_GROUP_ID} /* Products */ = {{')
    A("\t\t\tisa = PBXGroup;")
    A("\t\t\tchildren = (")
    A(f'\t\t\t\t{PRODUCT_REF_ID} /* KnitFlow.app */,')
    A("\t\t\t);")
    A('\t\t\tname = Products;')
    A("\t\t\tsourceTree = \"<group>\";")
    A("\t\t};")
    A("/* End PBXGroup section */")
    A("")

    # ── PBXNativeTarget ───────────────────────────────────────────────────────
    A("/* Begin PBXNativeTarget section */")
    A(f'\t\t{TARGET_ID} /* KnitFlow */ = {{')
    A("\t\t\tisa = PBXNativeTarget;")
    A(f'\t\t\tbuildConfigurationList = {BUILD_CONFIG_LIST_TARGET} /* Build configuration list for PBXNativeTarget "KnitFlow" */;')
    A("\t\t\tbuildPhases = (")
    A(f'\t\t\t\t{SOURCES_PHASE_ID} /* Sources */,')
    A(f'\t\t\t\t{FRAMEWORKS_PHASE_ID} /* Frameworks */,')
    A(f'\t\t\t\t{RESOURCES_PHASE_ID} /* Resources */,')
    A("\t\t\t);")
    A("\t\t\tbuildRules = (")
    A("\t\t\t);")
    A("\t\t\tdependencies = (")
    A("\t\t\t);")
    A('\t\t\tname = KnitFlow;')
    A(f'\t\t\tproductName = KnitFlow;')
    A(f'\t\t\tproductReference = {PRODUCT_REF_ID} /* KnitFlow.app */;')
    A('\t\t\tproductType = "com.apple.product-type.application";')
    A("\t\t};")
    A("/* End PBXNativeTarget section */")
    A("")

    # ── PBXProject ────────────────────────────────────────────────────────────
    A("/* Begin PBXProject section */")
    A(f'\t\t{PROJECT_ID} /* Project object */ = {{')
    A("\t\t\tisa = PBXProject;")
    A("\t\t\tattributes = {")
    A('\t\t\t\tBuildIndependentTargetsInParallel = 1;')
    A('\t\t\t\tLastSwiftUpdateCheck = 1600;')
    A('\t\t\t\tLastUpgradeCheck = 1600;')
    A("\t\t\t\tTargetAttributes = {")
    A(f'\t\t\t\t\t{TARGET_ID} = {{')
    A('\t\t\t\t\t\tCreatedOnToolsVersion = 16.0;')
    A("\t\t\t\t\t};")
    A("\t\t\t\t};")
    A("\t\t\t};")
    A(f'\t\t\tbuildConfigurationList = {BUILD_CONFIG_LIST_PROJECT} /* Build configuration list for PBXProject "KnitFlow" */;')
    A('\t\t\tcompatibilityVersion = "Xcode 14.0";')
    A('\t\t\tdevelopmentRegion = en;')
    A('\t\t\thasScannedForEncodings = 0;')
    A('\t\t\tknownRegions = (')
    A('\t\t\t\ten,')
    A('\t\t\t\tBase,')
    A('\t\t\t);')
    A(f'\t\t\tmainGroup = {MAIN_GROUP_ID};')
    A(f'\t\t\tproductRefGroup = {PRODUCTS_GROUP_ID} /* Products */;')
    A('\t\t\tprojectDirPath = "";')
    A('\t\t\tprojectRoot = "";')
    A('\t\t\ttargets = (')
    A(f'\t\t\t\t{TARGET_ID} /* KnitFlow */,')
    A('\t\t\t);')
    A("\t\t};")
    A("/* End PBXProject section */")
    A("")

    # ── PBXResourcesBuildPhase ────────────────────────────────────────────────
    A("/* Begin PBXResourcesBuildPhase section */")
    A(f'\t\t{RESOURCES_PHASE_ID} /* Resources */ = {{')
    A("\t\t\tisa = PBXResourcesBuildPhase;")
    A("\t\t\tbuildActionMask = 2147483647;")
    A("\t\t\tfiles = (")
    A(f'\t\t\t\t{ASSETS_BUILD_FILE} /* Assets.xcassets in Resources */,')
    A("\t\t\t);")
    A("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    A("\t\t};")
    A("/* End PBXResourcesBuildPhase section */")
    A("")

    # ── PBXSourcesBuildPhase ──────────────────────────────────────────────────
    A("/* Begin PBXSourcesBuildPhase section */")
    A(f'\t\t{SOURCES_PHASE_ID} /* Sources */ = {{')
    A("\t\t\tisa = PBXSourcesBuildPhase;")
    A("\t\t\tbuildActionMask = 2147483647;")
    A("\t\t\tfiles = (")
    for s in source_entries:
        A(f'\t\t\t\t{s["build_file_id"]} /* {s["name"]} in Sources */,')
    A("\t\t\t);")
    A("\t\t\trunOnlyForDeploymentPostprocessing = 0;")
    A("\t\t};")
    A("/* End PBXSourcesBuildPhase section */")
    A("")

    # ── XCBuildConfiguration ──────────────────────────────────────────────────
    common_settings = textwrap.dedent("""\
        ALWAYS_SEARCH_USER_PATHS = NO;
        ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
        CLANG_ANALYZER_NONNULL = YES;
        CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
        CLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
        CLANG_ENABLE_MODULES = YES;
        CLANG_ENABLE_OBJC_ARC = YES;
        CLANG_ENABLE_OBJC_WEAK = YES;
        CLANG_WARN_BLOCK_CAPTURE_AUTORELEASING = YES;
        CLANG_WARN_BOOL_CONVERSION = YES;
        CLANG_WARN_COMMA = YES;
        CLANG_WARN_CONSTANT_CONVERSION = YES;
        CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS = YES;
        CLANG_WARN_DIRECT_OBJC_ISA_USAGE = YES_ERROR;
        CLANG_WARN_DOCUMENTATION_COMMENTS = YES;
        CLANG_WARN_EMPTY_BODY = YES;
        CLANG_WARN_ENUM_CONVERSION = YES;
        CLANG_WARN_INFINITE_RECURSION = YES;
        CLANG_WARN_INT_CONVERSION = YES;
        CLANG_WARN_NON_LITERAL_NULL_CONVERSION = YES;
        CLANG_WARN_OBJC_IMPLICIT_RETAIN_SELF = YES;
        CLANG_WARN_OBJC_LITERAL_CONVERSION = YES;
        CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR;
        CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER = YES;
        CLANG_WARN_RANGE_LOOP_ANALYSIS = YES;
        CLANG_WARN_STRICT_PROTOTYPES = YES;
        CLANG_WARN_SUSPICIOUS_MOVE = YES;
        CLANG_WARN_UNGUARDED_AVAILABILITY = YES_AGGRESSIVE;
        CLANG_WARN_UNREACHABLE_CODE = YES;
        CLANG_WARN__DUPLICATE_METHOD_MATCH = YES;
        COPY_PHASE_STRIP = NO;
        ENABLE_STRICT_OBJC_MSGSEND = YES;
        ENABLE_USER_SCRIPT_SANDBOXING = YES;
        GCC_C_LANGUAGE_STANDARD = gnu17;
        GCC_NO_COMMON_BLOCKS = YES;
        GCC_WARN_64_TO_32_BIT_CONVERSION = YES;
        GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR;
        GCC_WARN_UNDECLARED_SELECTOR = YES;
        GCC_WARN_UNINITIALIZED_AUTOS = YES_AGGRESSIVE;
        GCC_WARN_UNUSED_FUNCTION = YES;
        GCC_WARN_UNUSED_VARIABLE = YES;
        IPHONEOS_DEPLOYMENT_TARGET = 17.0;
        LOCALIZATION_PREFERS_STRING_CATALOGS = YES;
        MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
        MTL_FAST_MATH = YES;
        SDKROOT = iphoneos;
        SWIFT_EMIT_LOC_STRINGS = YES;""")

    A("/* Begin XCBuildConfiguration section */")

    # Project Debug
    A(f'\t\t{CONFIG_DEBUG_PROJECT} /* Debug */ = {{')
    A("\t\t\tisa = XCBuildConfiguration;")
    A("\t\t\tbuildSettings = {")
    for line in common_settings.splitlines():
        A(f'\t\t\t\t{line}')
    A('\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;')
    A('\t\t\t\tENABLE_TESTABILITY = YES;')
    A('\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;')
    A('\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;')
    A('\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = ("DEBUG=1", "$(inherited)");')
    A('\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;')
    A('\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";')
    A('\t\t\t\tSIMULATOR_DEPLOYMENT_TARGET = 17.0;')
    A("\t\t\t};")
    A('\t\t\tname = Debug;')
    A("\t\t};")

    # Project Release
    A(f'\t\t{CONFIG_RELEASE_PROJECT} /* Release */ = {{')
    A("\t\t\tisa = XCBuildConfiguration;")
    A("\t\t\tbuildSettings = {")
    for line in common_settings.splitlines():
        A(f'\t\t\t\t{line}')
    A('\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";')
    A('\t\t\t\tENABLE_NS_ASSERTIONS = NO;')
    A('\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;')
    A('\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-O";')
    A('\t\t\t\tVALIDATE_PRODUCT = YES;')
    A("\t\t\t};")
    A('\t\t\tname = Release;')
    A("\t\t};")

    target_settings = textwrap.dedent("""\
        ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
        ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
        CODE_SIGN_STYLE = Automatic;
        CURRENT_PROJECT_VERSION = 1;
        GENERATE_INFOPLIST_FILE = NO;
        INFOPLIST_FILE = Info.plist;
        IPHONEOS_DEPLOYMENT_TARGET = 17.0;
        LD_RUNPATH_SEARCH_PATHS = ("$(inherited)", "@executable_path/Frameworks");
        MARKETING_VERSION = 1.0;
        PRODUCT_BUNDLE_IDENTIFIER = com.knitflow.app;
        PRODUCT_NAME = "$(TARGET_NAME)";
        SDKROOT = iphoneos;
        SWIFT_EMIT_LOC_STRINGS = YES;
        SWIFT_VERSION = 5.0;
        TARGETED_DEVICE_FAMILY = "1,2";""")

    # Target Debug
    A(f'\t\t{CONFIG_DEBUG_TARGET} /* Debug */ = {{')
    A("\t\t\tisa = XCBuildConfiguration;")
    A("\t\t\tbuildSettings = {")
    for line in target_settings.splitlines():
        A(f'\t\t\t\t{line}')
    A("\t\t\t};")
    A('\t\t\tname = Debug;')
    A("\t\t};")

    # Target Release
    A(f'\t\t{CONFIG_RELEASE_TARGET} /* Release */ = {{')
    A("\t\t\tisa = XCBuildConfiguration;")
    A("\t\t\tbuildSettings = {")
    for line in target_settings.splitlines():
        A(f'\t\t\t\t{line}')
    A("\t\t\t};")
    A('\t\t\tname = Release;')
    A("\t\t};")

    A("/* End XCBuildConfiguration section */")
    A("")

    # ── XCConfigurationList ───────────────────────────────────────────────────
    A("/* Begin XCConfigurationList section */")
    A(f'\t\t{BUILD_CONFIG_LIST_PROJECT} /* Build configuration list for PBXProject "KnitFlow" */ = {{')
    A("\t\t\tisa = XCConfigurationList;")
    A("\t\t\tbuildConfigurations = (")
    A(f'\t\t\t\t{CONFIG_DEBUG_PROJECT} /* Debug */,')
    A(f'\t\t\t\t{CONFIG_RELEASE_PROJECT} /* Release */,')
    A("\t\t\t);")
    A('\t\t\tdefaultConfigurationIsVisible = 0;')
    A('\t\t\tdefaultConfigurationName = Release;')
    A("\t\t};")

    A(f'\t\t{BUILD_CONFIG_LIST_TARGET} /* Build configuration list for PBXNativeTarget "KnitFlow" */ = {{')
    A("\t\t\tisa = XCConfigurationList;")
    A("\t\t\tbuildConfigurations = (")
    A(f'\t\t\t\t{CONFIG_DEBUG_TARGET} /* Debug */,')
    A(f'\t\t\t\t{CONFIG_RELEASE_TARGET} /* Release */,')
    A("\t\t\t);")
    A('\t\t\tdefaultConfigurationIsVisible = 0;')
    A('\t\t\tdefaultConfigurationName = Release;')
    A("\t\t};")
    A("/* End XCConfigurationList section */")
    A("")

    A("\t};")
    A(f'\trootObject = {PROJECT_ID} /* Project object */;')
    A("}")
    return "\n".join(lines)


# ── Info.plist ────────────────────────────────────────────────────────────────

INFO_PLIST = """\
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
    <array>
        <string>armv7</string>
    </array>
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

# ── Assets.xcassets stubs ─────────────────────────────────────────────────────

ASSETS_CONTENTS = '{"info":{"author":"xcode","version":1}}'
ACCENT_CONTENTS = '{"colors":[{"color":{"colorSpace":"sRGB","components":{"alpha":"1.000","blue":"0.600","green":"0.400","red":"0.800"}},"idiom":"universal"}],"info":{"author":"xcode","version":1}}'
APPICON_CONTENTS = '{"images":[{"idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}'

# ── Write everything ──────────────────────────────────────────────────────────

BASE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(BASE, "KnitFlow.xcodeproj")
PBXPROJ = os.path.join(PROJ, "project.pbxproj")

os.makedirs(PROJ, exist_ok=True)

# project.pbxproj
with open(PBXPROJ, "w") as f:
    f.write(pbxproj())
print(f"✅  Wrote {PBXPROJ}")

# Info.plist
plist_path = os.path.join(BASE, "Info.plist")
with open(plist_path, "w") as f:
    f.write(INFO_PLIST)
print(f"✅  Wrote {plist_path}")

# Assets.xcassets
assets_dir = os.path.join(BASE, "Assets.xcassets")
accent_dir = os.path.join(assets_dir, "AccentColor.colorset")
icon_dir   = os.path.join(assets_dir, "AppIcon.appiconset")
os.makedirs(accent_dir, exist_ok=True)
os.makedirs(icon_dir, exist_ok=True)

with open(os.path.join(assets_dir, "Contents.json"), "w") as f:
    f.write(ASSETS_CONTENTS)
with open(os.path.join(accent_dir, "Contents.json"), "w") as f:
    f.write(ACCENT_CONTENTS)
with open(os.path.join(icon_dir, "Contents.json"), "w") as f:
    f.write(APPICON_CONTENTS)
print(f"✅  Wrote Assets.xcassets")

print()
print("🚀  Done! Now run:")
print(f"    open {PROJ}")
print("    Then press ⌘R to build & run on the simulator.")
