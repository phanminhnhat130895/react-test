import { Avatar } from '@mui/material';
import type { Token } from '../types';
export function TokenAvatar({ token, size = 32 }: { token: Token; size?: number }) {
  return (
    <Avatar
      src={token.icon ?? undefined}
      alt=""
      sx={{
        width: size,
        height: size,
        bgcolor: '#e1edfa',
        color: 'primary.main',
        fontSize: size / 2.5,
      }}
    >
      {token.currency.slice(0, 2)}
    </Avatar>
  );
}
