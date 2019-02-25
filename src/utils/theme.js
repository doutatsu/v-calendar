import defaultThemeConfig from './defaults/theme.json';
import {
  isBoolean,
  isObject,
  isString,
  capitalize,
  kebabCase,
  has,
  hasAny,
  get,
  set,
  toPairs,
  defaults,
} from './_';

// const cssProps = ['bg', 'text'];
// const colors = ['blue', 'red', 'orange'];
// const colorSuffixes = [
//   'L5',
//   'L4',
//   'L3',
//   'L2',
//   'L1',
//   'D1',
//   'D2',
//   'D3',
//   'D4',
//   'D5',
// ];

// Creates all the css classes needed for the theme
// function mixinCssClasses(target) {
//   cssProps.forEach(prop => {
//     colors.forEach(color => {
//       colorSuffixes.forEach(colorSuffix => {
//         const key = `${prop}${capitalize(color)}${colorSuffix}`;
//         target[key] = kebabCase(key);
//       });
//     });
//   });
//   return target;
// }

const targetProps = ['base', 'start', 'end', 'startEnd'];
const displayProps = ['class', 'style', 'color', 'fillMode'];

export const generateTheme = ({ color, isDark, config }) => {
  const themeConfig = defaults(
    {
      color: color || defaultThemeConfig.color,
      isDark: isBoolean(isDark) ? isDark : defaultThemeConfig.isDark,
    },
    config,
    defaultThemeConfig,
  );

  const { color: themeColor, isDark: themeIsDark } = themeConfig;
  const getConfig = (
    prop,
    { color: propColor = themeColor, isDark: propIsDark = themeIsDark },
  ) => {
    if (!has(themeConfig, prop)) return undefined;
    let propVal = get(themeConfig, prop);
    if (isObject(propVal) && hasAny(propVal, ['light', 'dark'])) {
      propVal = propIsDark ? propVal.dark : propVal.light;
    }
    if (isString(propVal)) {
      return propVal.replace(/{color}/g, propColor);
    }
  };

  const theme = {
    color: themeColor,
    isDark: themeIsDark,
    getConfig,
  };

  toPairs(themeConfig).forEach(([prop]) => {
    Object.defineProperty(theme, prop, {
      get() {
        return getConfig(prop, {});
      },
    });
  });

  return theme;
};

const defaultTheme = generateTheme(defaultThemeConfig);

// Normalizes attribute config to the structure defined by the properties
function normalizeAttr({
  config,
  type,
  targetProps,
  displayProps,
  themeConfig,
}) {
  let root = {};
  let rootColor = themeConfig.color || defaultThemeConfig.color;
  // Assign default attribute for booleans or strings
  if (config === true || isString(config)) {
    rootColor = isString(config) ? config : rootColor;
    root = { ...(themeConfig[type] || defaultThemeConfig[type]) };
    // Mixin objects at top level
  } else if (isObject(config)) {
    root = { ...config };
  } else {
    return null;
  }
  // Move non-target properties to base target
  if (!hasAny(root, targetProps)) {
    root = { base: { ...root } };
  }
  // Normalize each target
  toPairs(root).forEach(([targetType, targetConfig]) => {
    let targetColor = rootColor;
    if (targetConfig === true || isString(targetConfig)) {
      targetColor = isString(targetConfig) ? targetConfig : targetColor;
      root[targetType] = { color: targetColor };
    } else if (isObject(targetConfig)) {
      root[targetType] = { ...targetConfig };
    }

    if (!hasAny(root[targetType], displayProps)) {
      root[targetType] = { style: { ...root[targetType] } };
    }

    displayProps.forEach(displayType => {
      const displayPath = `${targetType}.${displayType}`;
      if (!has(root, displayPath) && has(themeConfig[type], displayPath)) {
        set(root, displayPath, get(themeConfig[type], displayPath));
      }
    });
    // Set the theme color if it is missing
    if (!has(root, `${targetType}.color`)) {
      set(root, `${targetType}.color`, targetColor);
    }
  });
  return root;
}

export const normalizeHighlight = (config, theme = defaultTheme) => {
  const highlight = normalizeAttr({
    config,
    type: 'highlight',
    targetProps,
    displayProps,
    theme,
  });
  toPairs(highlight).map(([targetType, targetConfig]) => {
    const themeConfig = {
      isDark: theme.isDark,
      color: targetConfig.color || theme.color,
    };
    let bgClass, contentClass;
    switch (targetConfig.fillMode) {
      case 'light':
        bgClass = theme.getConfig('highlightFillLightBg', themeConfig); // `bg-${color}-${isDark ? 'd5' : 'l5'}`;
        contentClass = theme.getConfig('highlightFillLightText', themeConfig); // `text-${isDark ? 'white' : color}${isDark ? '' : '-d4'}`;
        break;
      case 'solid':
        bgClass = theme.getConfig('highlightFillSolidBg', themeConfig); // `bg-${color}-${isDark ? 'l1' : 'd1'}`;
        contentClass = theme.getConfig('highlightFillSolidText', themeConfig); // `text-white`;
        break;
    }
    targetConfig.class = `${targetConfig.class} ${bgClass}`;
    targetConfig.contentClass = `${targetConfig.contentClass} ${contentClass}`;
  });
  return highlight;
};

export default generateTheme;
