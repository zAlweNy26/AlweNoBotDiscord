export interface MessageMember {
  id: string;
  username: string;
}

export function fillMessage(template: string, member: MessageMember, memberCount?: number): string {
  let result = template
    .replaceAll("{{utente}}", `<@${member.id}>`)
    .replaceAll("{{username}}", member.username);
  if (memberCount !== undefined) {
    result = result.replaceAll("{{membri}}", String(memberCount));
  }
  return result;
}
