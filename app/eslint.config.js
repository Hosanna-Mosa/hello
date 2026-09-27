// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

/**
 * The bare React Native primitives. Screens must never import these directly —
 * they go through the wrappers in `components/common/atoms/`, which is what
 * keeps the Phase 10 component score at zero and gives the theme one place to
 * change. The atoms themselves are exempt: they *are* the one thin layer.
 */
const BARE_PRIMITIVES = [
  "View",
  "Text",
  "Pressable",
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "Image",
  "ImageBackground",
  "ScrollView",
  "FlatList",
  "SectionList",
  "TextInput",
  "SafeAreaView",
  "KeyboardAvoidingView",
  "ActivityIndicator",
];

/** The four text wrappers. M2: none of them may contain another. */
const TEXT_WRAPPERS = ["Heading", "Body", "Label", "Caption", "Text"];
const TEXT_SELECTOR = `JSXElement[openingElement.name.name=/^(${TEXT_WRAPPERS.join("|")})$/]`;

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "expo-env.d.ts", "nativewind-env.d.ts"],
  },

  // --- Guard 1: no bare RN primitives outside the atoms layer ---
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/common/atoms/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: BARE_PRIMITIVES,
              message:
                "Import the wrapper from '@/components/common' instead of the bare React Native primitive. Only components/common/atoms/ may touch these.",
            },
            {
              name: "react-native-safe-area-context",
              importNames: ["SafeAreaView"],
              message:
                "Use the SafeArea atom from '@/components/common'. It belongs in a template, never scattered through screens.",
            },
            {
              name: "expo-image",
              importNames: ["Image"],
              message:
                "Use the Picture atom from '@/components/common' instead of expo-image's Image.",
            },
          ],
        },
      ],
    },
  },

  // --- Guard 2 (M2): a text wrapper never nests inside another text wrapper ---
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `${TEXT_SELECTOR} ${TEXT_SELECTOR}`,
          message:
            "M2: a text wrapper must never nest inside another text wrapper. A bold word inside a sentence uses a plain Text, not a nested Heading/Body/Label/Caption.",
        },
      ],
    },
  },
]);
