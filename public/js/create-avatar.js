document.addEventListener("DOMContentLoaded", function(){
    const render = createAvatar()

    render()
})

function createAvatar(){
    const container = createEl("div")

    const uploadAvatarImageSection = createEl("div")
    const label = createEl("p")
    const uploader = createFileSelector()

    uploadAvatarImageSection.className = "flex gap-4"

// Main Uploadeer
    label.textContent = "Upload Avatar Image"
    uploadAvatarImageSection.append(label, uploader)


    const propertySelectorSection = createEl("div")
    const sectionLabel = createEl("p")
    sectionLabel.textContent = "Upload Images for Available Locations:"

    

    propertySelectorSection.className = "p-2 bg-gray-300"

    propertySelectorSection.append(sectionLabel, createSelectorSection("Home"), createSelectorSection("Forest"))

    container.append(uploadAvatarImageSection, propertySelectorSection)
    // document.body.append(container)
    return (pageSection)=>{
        pageSection.append(container)
    }
}

function createFileSelector(){
    const selector = createEl("input")

    selector.type = "file"
    return selector
}

function createSelectorSection(labelText){
    const container = createEl("div")

    const label = createEl("p")
    label.textContent = labelText
    const selector = createFileSelector()


    container.append(label, selector)
    // section.append(container)
    return container
}

function createEl(el){
    return document.createElement(el)
}
