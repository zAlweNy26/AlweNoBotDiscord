export function fillMessage(template: string, member: { id: string; username: string }, memberCount?: number) {
  let result = template.replaceAll("{{utente}}", `<@${member.id}>`).replaceAll("{{username}}", member.username)
  if (memberCount !== undefined) {
    result = result.replaceAll("{{membri}}", String(memberCount))
  }
  return result
}
