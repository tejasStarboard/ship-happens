import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@ship-happens/ui/components/avatar"
import { getInitials } from "@/lib/shared/string"
import { cn } from "@ship-happens/ui/lib/utils"

type UserAvatarProps = {
  name: string
  image?: string | null
  email?: string | null
  className?: string
  fallbackClassName?: string
}

export function UserAvatar({
  name,
  image,
  email,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  const label = name.trim() || email?.trim() || "?"
  return (
    <Avatar className={cn("size-8", className)}>
      {image ? <AvatarImage src={image} alt={label} /> : null}
      <AvatarFallback className={fallbackClassName}>
        {getInitials(label)}
      </AvatarFallback>
    </Avatar>
  )
}
