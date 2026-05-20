import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import moment from 'moment';
import 'moment/locale/es';
import type { Comment } from '@/shared/lib/taskapp/types';

interface Props {
  comment: Comment;
  currentUserEmail: string;
  currentUserName: string;
}

function initialsFrom(name: string | null, email: string | null): string {
  const source = name?.trim() || email || '?';
  const parts = source.split(/\s|@|\./).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export function TicketCommentItem({ comment, currentUserEmail, currentUserName }: Props) {
  const isMine = comment.author_email === currentUserEmail;
  const displayName = isMine ? currentUserName : (comment.author_email ?? 'Soporte');
  const initials = initialsFrom(isMine ? currentUserName : null, comment.author_email);
  const isOptimistic = comment.id < 0;

  return (
    <div className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div
        className={`max-w-[80%] space-y-1 ${isMine ? 'items-end' : 'items-start'} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isMine ? 'bg-primary/10 text-foreground' : 'bg-muted text-foreground'
          } ${isOptimistic ? 'opacity-60' : ''}`}
        >
          <p className="whitespace-pre-wrap">{comment.body}</p>
        </div>
        <div
          className={`flex items-center gap-2 text-[11px] text-muted-foreground ${isMine ? 'justify-end' : ''}`}
        >
          <span>{displayName}</span>
          <span aria-hidden>·</span>
          <time dateTime={comment.created_at}>
            {moment(comment.created_at).locale('es').fromNow()}
          </time>
        </div>
      </div>
    </div>
  );
}
