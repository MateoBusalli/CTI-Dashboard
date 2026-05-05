import { theme } from 'antd'

const ctiTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#1668dc',
    colorBgBase: '#070b10',
    colorBgContainer: '#0d1520',
    colorBgElevated: '#111d2e',
    colorBorder: '#1a2e45',
    colorBorderSecondary: '#12202f',
    colorText: '#c4d0e0',
    colorTextSecondary: '#5a6f85',
    colorTextTertiary: '#3d5266',
    borderRadius: 2,
    borderRadiusLG: 3,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    lineWidth: 1,
  },
  components: {
    Layout: {
      siderBg: '#060a0f',
      headerBg: '#060a0f',
      bodyBg: '#070b10',
    },
    Table: {
      headerBg: '#09111a',
      rowHoverBg: '#0f1e30',
      borderColor: '#1a2e45',
      headerSplitColor: '#1a2e45',
      fontSize: 12,
    },
    Input: {
      colorBgContainer: '#0a1422',
      colorBorder: '#1a2e45',
    },
    Select: {
      colorBgContainer: '#0a1422',
    },
    Slider: {
      trackBg: '#1668dc',
      railBg: '#1a2e45',
    },
    Menu: {
      darkItemBg: '#060a0f',
      darkSubMenuItemBg: '#060a0f',
      darkItemSelectedBg: '#0f1e30',
      fontSize: 13,
    },
    Tag: {
      borderRadius: 2,
    },
    Alert: {
      borderRadius: 2,
    },
  },
}

export default ctiTheme
