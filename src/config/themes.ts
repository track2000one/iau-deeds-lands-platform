export interface ColorTheme {
  id: string;
  name: string;
  nameAr: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    destructive?: string;
  };
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'theme-1',
    name: 'Sky Blue',
    nameAr: 'الأزرق السماوي',
    colors: {
      primary: '#2C5F8D',
      secondary: '#5A9BD5',
      accent: '#FF8C42',
      background: '#F5F9FC',
      destructive: '#D32F2F'
    }
  },
  {
    id: 'theme-2',
    name: 'Rose Garden',
    nameAr: 'حديقة الورد',
    colors: {
      primary: '#8B4854',
      secondary: '#C17B8A',
      accent: '#6B9080',
      background: '#FAF7F2',
      destructive: '#C41E3A'
    }
  },
  {
    id: 'theme-3',
    name: 'Sandy Beach',
    nameAr: 'الشاطئ الرملي',
    colors: {
      primary: '#6B5D50',
      secondary: '#A89586',
      accent: '#4A7C9B',
      background: '#FDFAF5',
      destructive: '#B8001F'
    }
  },
  {
    id: 'theme-4',
    name: 'Ocean Breeze',
    nameAr: 'نسيم المحيط',
    colors: {
      primary: '#2E7D8F',
      secondary: '#5DADE2',
      accent: '#E67E22',
      background: '#F0F8FF',
      destructive: '#C0392B'
    }
  },
  {
    id: 'theme-5',
    name: 'Elegant Dark',
    nameAr: 'الأنيق الداكن',
    colors: {
      primary: '#6B8E9E',
      secondary: '#9BB4C1',
      accent: '#E6B88A',
      background: '#1A2332',
      destructive: '#E74C3C'
    }
  },
  {
    id: 'theme-6',
    name: 'Modern Red',
    nameAr: 'الأحمر الحديث',
    colors: {
      primary: '#C41E3A',
      secondary: '#E94B3C',
      accent: '#7A8B99',
      background: '#FAFAFA',
      destructive: '#C41E3A'
    }
  },
  {
    id: 'theme-7',
    name: 'Forest Green',
    nameAr: 'الأخضر الغابي',
    colors: {
      primary: '#2D5016',
      secondary: '#4A7C2C',
      accent: '#8B9D77',
      background: '#F7FAF4',
      destructive: '#B8001F'
    }
  },
  {
    id: 'theme-8',
    name: 'Professional Blue (Default)',
    nameAr: 'الأزرق المهني (افتراضي)',
    colors: {
      primary: '#2C4A6B',
      secondary: '#4A6B8F',
      accent: '#6B9EC1',
      background: '#FCFAEE',
      destructive: '#B8001F'
    }
  }
];

export const getThemeById = (id: string): ColorTheme | undefined => {
  return colorThemes.find(theme => theme.id === id);
};

export const getDefaultTheme = (): ColorTheme => {
  return colorThemes[7]; // Professional Blue
};
