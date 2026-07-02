import { Icons, IconSrc } from 'folds';

export const getGenderIcon = (genderId: string | undefined): IconSrc => {
  switch (genderId) {
    case 'male':
    case 'man':
      return Icons.User;
    case 'female':
    case 'woman':
      return Icons.User; // Ideally a female icon, but folds doesn't seem to have one
    case 'trans':
      return Icons.Peace;
    case 'non-binary':
      return Icons.Smile;
    case 'other':
      return Icons.Leaf;
    default:
      return Icons.User;
  }
};

export const getGenderAbbreviation = (genderId: string | undefined): string | undefined => {
  switch (genderId) {
    case 'male':
      return 'M';
    case 'female':
      return 'F';
    case 'trans':
      return 'T';
    case 'non-binary':
      return 'NB';
    case 'other':
      return 'O';
    default:
      return undefined;
  }
};
