$code = {
  if ($args[0] -eq 'snipaste-paste')
  {
      $ssfile = $env:TEMP + '\mpv-clip-' + [int][Math]::Ceiling((New-TimeSpan -Start (Get-Date "01/01/1970") -End (Get-Date)).TotalSeconds) + '.png'
      $mp.commandv("show-text", "Snipping…")
      $mp.commandv("osd-msg", "screenshot-to-file", $ssfile);

      Snipaste.exe paste --files $ssfile
      Show-Notification 'mpv.net' 'Pasted!'
  }
}

$mp.register_event("client-message", $code)

function Show-Notification {
  [cmdletbinding()]
  Param (
      [string]
      $ToastTitle,
      [string]
      [parameter(ValueFromPipeline)]
      $ToastText
  )

  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
  $Template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)

  $RawXml = [xml] $Template.GetXml()
  ($RawXml.toast.visual.binding.text|where {$_.id -eq "1"}).AppendChild($RawXml.CreateTextNode($ToastTitle)) > $null
  ($RawXml.toast.visual.binding.text|where {$_.id -eq "2"}).AppendChild($RawXml.CreateTextNode($ToastText)) > $null

  $SerializedXml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $SerializedXml.LoadXml($RawXml.OuterXml)

  $Toast = [Windows.UI.Notifications.ToastNotification]::new($SerializedXml)
  $Toast.Tag = "PowerShell"
  $Toast.Group = "PowerShell"
  $Toast.ExpirationTime = [DateTimeOffset]::Now.AddMinutes(1)

  $Notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("PowerShell")
  $Notifier.Show($Toast);
}
